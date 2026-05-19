import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { createRouter, userQuery, adminQuery, superadminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, users, products, settings } from "@db/schema";

export const orderRouter = createRouter({
  /* ================================================================
     CREATE - Revendedor crea un pedido
     ================================================================ */
  create: userQuery
    .input(z.object({
      paymentType: z.enum(["efectivo", "transferencia"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Get cart items with product data (including tiendanube IDs)
      const cartRows = await db.execute(
        `SELECT c.*, p.name as productName, p.priceCash30, p.priceTransfer25, p.priceList, p.tiendanubeId
         FROM cartItems c
         JOIN products p ON c.productId = p.id
         WHERE c.userId = ${userId}` as any
      );
      const cartItems2 = (cartRows as any)[0] as any[];

      if (!cartItems2 || cartItems2.length === 0) {
        throw new Error("Carrito vacio");
      }

      const priceField = input.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";
      const total = cartItems2.reduce((sum: number, item: any) => {
        return sum + (Number(item[priceField]) * item.quantity);
      }, 0);

      // Insert order
      const orderResult = await db.insert(orders).values({
        userId,
        adminId: ctx.user.parentId ?? userId,
        totalAmount: total.toFixed(2),
        paymentType: input.paymentType,
        status: "pending",
        notes: input.notes || null,
        webhookSent: false,
      });
      const orderId = Number((orderResult as any)[0].insertId);

      // Insert order items with tiendanubeProductId
      for (const item of cartItems2) {
        const unitPrice = Number(item[priceField]);
        await db.insert(orderItems).values({
          orderId,
          productId: item.productId,
          productName: item.productName,
          tiendanubeProductId: item.tiendanubeId ? String(item.tiendanubeId) : null,
          quantity: item.quantity,
          price: unitPrice.toFixed(2),
          subtotal: (unitPrice * item.quantity).toFixed(2),
        });
      }

      // Clear cart
      await db.execute(`DELETE FROM cartItems WHERE userId = ${userId}` as any);

      return { id: orderId, total };
    }),

  /* ================================================================
     MY ORDERS - Para el revendedor
     ================================================================ */
  myOrders: userQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(orders)
      .where(eq(orders.userId, ctx.user.id))
      .orderBy(desc(orders.createdAt));
  }),

  /* ================================================================
     ADMIN: Listar pedidos de mis revendedores CON datos del revendedor
     Superadmin ve TODOS los pedidos
     ================================================================ */
  myOrdersAsAdmin: adminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const isSuper = ctx.user.role === "superadmin";

    // Obtener TODOS los pedidos primero
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

    // Obtener datos de los revendedores
    const revUsers = await db.select().from(users).where(eq(users.role, "revendedor"));

    let myOrders;
    if (isSuper) {
      // Superadmin ve todos los pedidos
      myOrders = allOrders;
    } else {
      // Admin normal solo ve los de sus revendedores
      const myRevIds = new Set(
        revUsers.filter(u => u.parentId === ctx.user.id).map(u => u.id)
      );
      myOrders = allOrders.filter(o => myRevIds.has(o.userId));
    }

    if (myOrders.length === 0) return [];

    // Obtener items de cada pedido
    const orderIds = myOrders.map(o => o.id);
    const allItems = await db.select().from(orderItems);
    const itemsFiltered = allItems.filter(item => orderIds.includes(item.orderId));

    // Agrupar items por orderId
    const itemsByOrder: Record<number, typeof allItems> = {};
    for (const item of itemsFiltered) {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    }

    // Mapear revendedores por ID
    const revById: Record<number, typeof revUsers[0]> = {};
    for (const u of revUsers) revById[u.id] = u;

    return myOrders.map(o => ({
      ...o,
      revendedorName: revById[o.userId]?.name ?? "Desconocido",
      revendedorEmail: revById[o.userId]?.email ?? "",
      revendedorPhone: revById[o.userId]?.phone ?? "",
      items: itemsByOrder[o.id] || [],
    }));
  }),

  /* ================================================================
     ADMIN: Ver detalle de un pedido (con items y revendedor)
     ================================================================ */
  detail: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const orderData = await db.select().from(orders)
        .where(eq(orders.id, input.id));
      if (orderData.length === 0) return null;
      const order = orderData[0];

      const revData = await db.select().from(users)
        .where(eq(users.id, order.userId));
      const rev = revData[0];

      const items = await db.select().from(orderItems)
        .where(eq(orderItems.orderId, input.id));

      return {
        ...order,
        revendedorName: rev?.name ?? "Desconocido",
        revendedorEmail: rev?.email ?? "",
        revendedorPhone: rev?.phone ?? "",
        items,
      };
    }),

  /* ================================================================
     ADMIN: Aprobar pedido (con descuento de stock en Tiendanube)
     ================================================================ */
  approve: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Obtener items del pedido con datos de productos
      const items = await db.select().from(orderItems)
        .where(eq(orderItems.orderId, input.id));

      // Obtener configuracion de Tiendanube
      const [s] = await db.select().from(settings).limit(1);

      // Descuento de stock en Tiendanube y local
      for (const item of items) {
        if (!item.tiendanubeProductId) continue;

        // Obtener producto local para tener el variantId y stock actual
        const prodRows = await db.select().from(products)
          .where(eq(products.tiendanubeId, item.tiendanubeProductId));
        if (prodRows.length === 0) continue;
        const product = prodRows[0];

        if (!product.tiendanubeVariantId) continue;

        const newStock = Math.max(0, (product.stock ?? 0) - item.quantity);

        // Actualizar en Tiendanube
        if (s?.tiendanubeApiToken && s?.tiendanubeStoreId) {
          try {
            await fetch(
              `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products/${item.tiendanubeProductId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authentication: `bearer ${s.tiendanubeApiToken}`,
                  "User-Agent": "Portal-Revendedores/1.0",
                },
                body: JSON.stringify({
                  variants: [{ id: Number(product.tiendanubeVariantId), stock: newStock }],
                }),
              }
            );
          } catch {
            // Si falla la llamada a Tiendanube, seguimos con el stock local
          }
        }

        // Actualizar stock local
        await db.update(products).set({ stock: newStock })
          .where(eq(products.id, product.id));
      }

      // Actualizar estado del pedido
      await db.update(orders).set({ status: "approved" })
        .where(eq(orders.id, input.id));

      // Webhook
      try {
        const orderData = await db.select().from(orders)
          .where(eq(orders.id, input.id));
        const order = orderData[0];
        if (order) {
          const webhookUrl = process.env.WEBHOOK_URL;
          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "order.approved",
                orderId: order.id,
                total: order.totalAmount,
                paymentType: order.paymentType,
                status: "approved",
              }),
            });
          }
        }
      } catch {}

      return { success: true };
    }),

  /* ================================================================
     ADMIN: Rechazar pedido
     ================================================================ */
  reject: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(orders).set({ status: "rejected" })
        .where(eq(orders.id, input.id));
      return { success: true };
    }),

  /* ================================================================
     ADMIN: Eliminar pedido
     ================================================================ */
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(orderItems).where(eq(orderItems.orderId, input.id));
      await db.delete(orders).where(eq(orders.id, input.id));
      return { success: true };
    }),

  /* ================================================================
     SUPERADMIN: Reporte de ventas por admin (aprobados/rechazados)
     ================================================================ */
  salesByAdmin: superadminQuery.query(async () => {
    const db = getDb();

    // Obtener todos los pedidos no pendientes
    const allOrders = await db.select().from(orders)
      .where(and(
        eq(orders.status, "approved"),
      ))
      .orderBy(desc(orders.createdAt));

    const rejectedOrders = await db.select().from(orders)
      .where(and(
        eq(orders.status, "rejected"),
      ))
      .orderBy(desc(orders.createdAt));

    // Obtener todos los admins
    const allAdmins = await db.select().from(users)
      .where(eq(users.role, "admin"));

    // Obtener items de todos los pedidos
    const allItems = await db.select().from(orderItems);

    // Helper: extraer fecha YYYY-MM-DD
    const getDate = (d: Date | string) => {
      const date = new Date(d);
      return date.toISOString().split("T")[0];
    };

    // Agrupar aprobados por adminId + fecha
    type DayKey = string; // "adminId:YYYY-MM-DD"
    const dayData: Record<DayKey, {
      adminId: number;
      adminName: string;
      date: string;
      approvedCount: number;
      approvedTotal: number;
      rejectedCount: number;
      rejectedTotal: number;
    }> = {};

    const adminById: Record<number, typeof allAdmins[0]> = {};
    for (const a of allAdmins) adminById[a.id] = a;

    // Procesar aprobados
    for (const order of allOrders) {
      const admin = adminById[order.adminId];
      if (!admin) continue;
      const date = getDate(order.createdAt);
      const key: DayKey = `${order.adminId}:${date}`;
      if (!dayData[key]) {
        dayData[key] = {
          adminId: order.adminId,
          adminName: admin.name,
          date,
          approvedCount: 0,
          approvedTotal: 0,
          rejectedCount: 0,
          rejectedTotal: 0,
        };
      }
      dayData[key].approvedCount++;
      dayData[key].approvedTotal += Number(order.totalAmount);
    }

    // Procesar rechazados
    for (const order of rejectedOrders) {
      const admin = adminById[order.adminId];
      if (!admin) continue;
      const date = getDate(order.createdAt);
      const key: DayKey = `${order.adminId}:${date}`;
      if (!dayData[key]) {
        dayData[key] = {
          adminId: order.adminId,
          adminName: admin.name,
          date,
          approvedCount: 0,
          approvedTotal: 0,
          rejectedCount: 0,
          rejectedTotal: 0,
        };
      }
      dayData[key].rejectedCount++;
      dayData[key].rejectedTotal += Number(order.totalAmount);
    }

    // Convertir a array y ordenar por fecha descendente, luego admin
    const result = Object.values(dayData).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return a.adminName.localeCompare(b.adminName);
    });

    return result;
  }),
});
