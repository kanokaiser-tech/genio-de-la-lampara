import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, userQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, users } from "@db/schema";

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

      // Get cart items with product data
      const cartRows = await db.execute(
        `SELECT c.*, p.name as productName, p.priceCash30, p.priceTransfer25, p.priceList
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

      // Insert order items
      for (const item of cartItems2) {
        const unitPrice = Number(item[priceField]);
        await db.insert(orderItems).values({
          orderId,
          productId: item.productId,
          productName: item.productName,
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
     ================================================================ */
  myOrdersAsAdmin: adminQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Obtener TODOS los pedidos primero
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

    // Obtener datos de los revendedores (users que hicieron los pedidos)
    const revIds = [...new Set(allOrders.map(o => o.userId))];
    const revUsers = revIds.length > 0
      ? await db.select().from(users).where(eq(users.role, "revendedor"))
      : [];

    // Filtrar solo los que pertenecen a este admin
    const myRevIds = new Set(
      revUsers.filter(u => u.parentId === ctx.user.id).map(u => u.id)
    );

    const myOrders = allOrders.filter(o => myRevIds.has(o.userId));
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
    const revById: Record<number, typeof users.$inferSelect> = {};
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
     ADMIN: Aprobar pedido
     ================================================================ */
  approve: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
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
      // Primero eliminar items (foreign key)
      await db.delete(orderItems).where(eq(orderItems.orderId, input.id));
      // Luego eliminar el pedido
      await db.delete(orders).where(eq(orders.id, input.id));
      return { success: true };
    }),
});
