import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { createRouter, userQuery, adminQuery, superadminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderExtras, users, products, settings, goldCoinTransactions } from "@db/schema";
import { calculateGoldCoins, coinsToPesos, GOLD_COIN_VALUE } from "./goldCoinsRouter";

export const orderRouter = createRouter({
  /* ================================================================
     CREATE - Revendedor crea un pedido
     ================================================================ */
  create: userQuery
    .input(z.object({
      paymentType: z.enum(["efectivo", "transferencia"]),
      notes: z.string().optional(),
      goldCoinsUsed: z.number().int().min(0).default(0),
      shippingType: z.enum(["none", "express", "free"]).default("none"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Get cart items with product data (including tiendanube IDs and stock)
      const cartRows = await db.execute(
        `SELECT c.*, p.name as productName, p.priceCash30, p.priceTransfer25, p.priceList, p.tiendanubeId, p.stock
         FROM cartItems c
         JOIN products p ON c.productId = p.id
         WHERE c.userId = ${userId}` as any
      );
      const cartItems2 = (cartRows as any)[0] as any[];

      if (!cartItems2 || cartItems2.length === 0) {
        throw new Error("Carrito vacio");
      }

      // VALIDAR STOCK: verificar que ningun item exceda el stock disponible
      for (const item of cartItems2) {
        const currentStock = Number(item.stock);
        if (item.quantity > currentStock) {
          throw new Error(
            `Stock insuficiente para "${item.productName}". Disponible: ${currentStock}, solicitado: ${item.quantity}`
          );
        }
      }

      const priceField = input.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";
      // Subtotal original = items + envio (SIN descontar monedas)
      let subtotalOriginal = cartItems2.reduce((sum: number, item: any) => {
        return sum + (Number(item[priceField]) * item.quantity);
      }, 0);

      // Sumar envio express si aplica
      if (input.shippingType === "express") {
        subtotalOriginal += 5000;
      }

      // Aplicar descuento con monedas de oro
      let discountPesos = 0;
      if (input.goldCoinsUsed > 0) {
        const [userRow] = await db.select({ goldCoins: users.goldCoins }).from(users).where(eq(users.id, userId));
        if (!userRow || userRow.goldCoins < input.goldCoinsUsed) {
          throw new Error("Saldo insuficiente de monedas de oro");
        }
        discountPesos = coinsToPesos(input.goldCoinsUsed);
      }

      // totalAmount = subtotal original (sin descontar monedas) - refleja el valor real de la venta
      // discountPesos = descuento por monedas de oro
      // El total a cobrar en efectivo/transferencia = totalAmount - discountPesos
      const totalReal = Math.max(0, subtotalOriginal - discountPesos);

      const orderResult = await db.insert(orders).values({
        userId,
        adminId: ctx.user.parentId ?? userId,
        totalAmount: subtotalOriginal.toFixed(2),
        paymentType: input.paymentType,
        shippingType: input.shippingType,
        status: "pending",
        notes: input.notes || null,
        goldCoinsUsed: input.goldCoinsUsed,
        discountPesos: discountPesos.toFixed(2),
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

      // Si uso monedas, registrar gasto
      if (input.goldCoinsUsed > 0) {
        const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        await db.insert(goldCoinTransactions).values({
          userId,
          orderId,
          type: "spent",
          amount: -input.goldCoinsUsed,
          description: `Usadas en pedido #${orderId}`,
          monthKey,
        });
        await db.execute(sql`UPDATE users SET goldCoins = goldCoins - ${input.goldCoinsUsed} WHERE id = ${userId}`);
      }

      // Clear cart
      await db.execute(`DELETE FROM cartItems WHERE userId = ${userId}` as any);

      return { id: orderId, total: totalReal, subtotalOriginal, discountPesos, goldCoinsUsed: input.goldCoinsUsed };
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

    // Obtener datos de TODOS los usuarios (revendedores y admins)
    const allUsers = await db.select().from(users);

    let myOrders;
    if (isSuper) {
      // Superadmin ve todos los pedidos
      myOrders = allOrders;
    } else {
      // Admin normal ve pedidos de sus revendedores Y de otros admins (para poder aprobarlos)
      // Los pedidos que no son de sus revendedores se marcan como "de otro admin"
      myOrders = allOrders;
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

    // Obtener extras de cada pedido
    const allExtras = await db.select().from(orderExtras);
    const extrasByOrder: Record<number, typeof allExtras> = {};
    for (const extra of allExtras) {
      if (!extrasByOrder[extra.orderId]) extrasByOrder[extra.orderId] = [];
      extrasByOrder[extra.orderId].push(extra);
    }

    // Mapear usuarios por ID
    const userById: Record<number, typeof allUsers[0]> = {};
    for (const u of allUsers) userById[u.id] = u;

    return myOrders.map(o => ({
      ...o,
      revendedorName: userById[o.userId]?.name ?? "Desconocido",
      revendedorEmail: userById[o.userId]?.email ?? "",
      revendedorPhone: userById[o.userId]?.phone ?? "",
      adminName: userById[o.adminId]?.name ?? "Sin admin",
      items: itemsByOrder[o.id] || [],
      extras: extrasByOrder[o.id] || [],
    }));
  }),

  /* ================================================================
     ADMIN: Ver detalle de un pedido (con items y revendedor)
     ================================================================ */
  detail: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
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

      const extras = await db.select().from(orderExtras)
        .where(eq(orderExtras.orderId, input.id));

      return {
        ...order,
        revendedorName: rev?.name ?? "Desconocido",
        revendedorEmail: rev?.email ?? "",
        revendedorPhone: rev?.phone ?? "",
        items,
        extras,
      };
    }),

  /* ================================================================
     ADMIN: Editar items de un pedido pendiente
     ================================================================ */
  updateItem: adminQuery
    .input(z.object({ orderId: z.number(), itemId: z.number(), quantity: z.number().int().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Verificar que el pedido esta pendiente
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order || order.status !== "pending") throw new Error("Solo se pueden editar pedidos pendientes");

      // Obtener item actual
      const [item] = await db.select().from(orderItems).where(eq(orderItems.id, input.itemId));
      if (!item || item.orderId !== input.orderId) throw new Error("Item no encontrado");

      // Actualizar cantidad y subtotal
      const unitPrice = Number(item.price);
      await db.update(orderItems)
        .set({ quantity: input.quantity, subtotal: (unitPrice * input.quantity).toFixed(2) })
        .where(eq(orderItems.id, input.itemId));

      // Recalcular total del pedido
      const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      const shippingCost = order.shippingType === "express" ? 5000 : 0;
      const newTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0) + shippingCost;
      await db.update(orders).set({ totalAmount: newTotal.toFixed(2) }).where(eq(orders.id, input.orderId));

      return { success: true, newTotal };
    }),

  removeItem: adminQuery
    .input(z.object({ orderId: z.number(), itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order || order.status !== "pending") throw new Error("Solo se pueden editar pedidos pendientes");

      await db.delete(orderItems).where(eq(orderItems.id, input.itemId));

      // Recalcular total
      const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      const shippingCost = order.shippingType === "express" ? 5000 : 0;
      const newTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0) + shippingCost;
      await db.update(orders).set({ totalAmount: newTotal.toFixed(2) }).where(eq(orders.id, input.orderId));

      return { success: true, newTotal, remainingItems: allItems.length };
    }),

  addItem: adminQuery
    .input(z.object({
      orderId: z.number(),
      productId: z.number(),
      quantity: z.number().int().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order || order.status !== "pending") throw new Error("Solo se pueden editar pedidos pendientes");

      // Obtener producto
      const [product] = await db.select().from(products).where(eq(products.id, input.productId));
      if (!product) throw new Error("Producto no encontrado");

      const priceField = order.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";
      const unitPrice = Number(product[priceField]);

      // Insertar item
      await db.insert(orderItems).values({
        orderId: input.orderId,
        productId: input.productId,
        productName: product.name,
        tiendanubeProductId: product.tiendanubeId ? String(product.tiendanubeId) : null,
        quantity: input.quantity,
        price: unitPrice.toFixed(2),
        subtotal: (unitPrice * input.quantity).toFixed(2),
      });

      // Recalcular total
      const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      const shippingCost = order.shippingType === "express" ? 5000 : 0;
      const newTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0) + shippingCost;
      await db.update(orders).set({ totalAmount: newTotal.toFixed(2) }).where(eq(orders.id, input.orderId));

      return { success: true, newTotal };
    }),

  /* ================================================================
     ADMIN: Cambiar metodo de pago de un pedido (pendiente o aprobado)
     ================================================================ */
  updatePaymentType: adminQuery
    .input(z.object({ orderId: z.number(), paymentType: z.enum(["efectivo", "transferencia"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order) throw new Error("Pedido no encontrado");
      if (order.status === "rejected") throw new Error("No se puede editar un pedido rechazado");

      // Obtener todos los items del pedido
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));

      // Recalcular precios con el nuevo metodo de pago
      const priceField = input.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";
      let newTotal = 0;

      for (const item of items) {
        // Obtener producto para el precio actualizado
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product) continue;

        const newPrice = Number(product[priceField as keyof typeof product]);
        const newSubtotal = newPrice * item.quantity;

        await db.update(orderItems)
          .set({ price: newPrice.toFixed(2), subtotal: newSubtotal.toFixed(2) })
          .where(eq(orderItems.id, item.id));

        newTotal += newSubtotal;
      }

      // Sumar extras
      const extras = await db.select().from(orderExtras).where(eq(orderExtras.orderId, input.orderId));
      const extrasTotal = extras.reduce((sum, e) => sum + Number(e.price), 0);
      newTotal += extrasTotal;

      // Sumar envio si aplica
      if (order.shippingType === "express") {
        newTotal += 5000;
      }

      // Actualizar pedido
      await db.update(orders)
        .set({ paymentType: input.paymentType, totalAmount: newTotal.toFixed(2) })
        .where(eq(orders.id, input.orderId));

      return { success: true, newTotal, paymentType: input.paymentType };
    }),

  /* ================================================================
     ADMIN: Agregar item extra a un pedido (pendiente o aprobado)
     ================================================================ */
  addExtra: adminQuery
    .input(z.object({
      orderId: z.number(),
      description: z.string().min(1).max(500),
      price: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order) throw new Error("Pedido no encontrado");
      if (order.status === "rejected") throw new Error("No se puede editar un pedido rechazado");

      // Insertar extra
      await db.insert(orderExtras).values({
        orderId: input.orderId,
        description: input.description,
        price: input.price.toFixed(2),
      });

      // Recalcular total
      const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      const allExtras = await db.select().from(orderExtras).where(eq(orderExtras.orderId, input.orderId));
      const itemsTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const extrasTotal = allExtras.reduce((sum, e) => sum + Number(e.price), 0);
      const shippingCost = order.shippingType === "express" ? 5000 : 0;
      const newTotal = itemsTotal + extrasTotal + shippingCost;

      await db.update(orders)
        .set({ totalAmount: newTotal.toFixed(2) })
        .where(eq(orders.id, input.orderId));

      return { success: true, newTotal };
    }),

  /* ================================================================
     ADMIN: Eliminar item extra de un pedido
     ================================================================ */
  removeExtra: adminQuery
    .input(z.object({ orderId: z.number(), extraId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order) throw new Error("Pedido no encontrado");

      await db.delete(orderExtras).where(eq(orderExtras.id, input.extraId));

      // Recalcular total
      const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      const allExtras = await db.select().from(orderExtras).where(eq(orderExtras.orderId, input.orderId));
      const itemsTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const extrasTotal = allExtras.reduce((sum, e) => sum + Number(e.price), 0);
      const shippingCost = order.shippingType === "express" ? 5000 : 0;
      const newTotal = itemsTotal + extrasTotal + shippingCost;

      await db.update(orders)
        .set({ totalAmount: newTotal.toFixed(2) })
        .where(eq(orders.id, input.orderId));

      return { success: true, newTotal };
    }),

  /* ================================================================
     ADMIN: Aprobar pedido (con descuento de stock en Tiendanube + remito)
     ================================================================ */
  approve: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Cualquier admin puede aprobar cualquier pedido pendiente
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id));
      if (!order) throw new Error("Pedido no encontrado");
      if (order.status !== "pending") throw new Error("El pedido no esta pendiente");

      // Generar numero de remito (siguiente disponible)
      let remitoNumber: string;
      try {
        const result = await db.execute(`SELECT MAX(CAST(remitoNumber AS UNSIGNED)) as maxRemito FROM orders WHERE remitoNumber IS NOT NULL` as any);
        const maxRemito = Number((result as any)[0]?.[0]?.maxRemito ?? 0);
        remitoNumber = String(maxRemito + 1).padStart(5, "0");
      } catch {
        remitoNumber = "00001";
      }

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

        // Actualizar en Tiendanube usando el mismo endpoint que funciona en el bot
        if (s?.tiendanubeApiToken && s?.tiendanubeStoreId && product.tiendanubeVariantId) {
          try {
            const response = await fetch(
              `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products/${item.tiendanubeProductId}/variants/${product.tiendanubeVariantId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authentication": `bearer ${s.tiendanubeApiToken}`,
                  "User-Agent": "Portal-Revendedores/1.0",
                },
                body: JSON.stringify({ stock: newStock }),
              }
            );
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[Tiendanube] ERROR product ${item.tiendanubeProductId}: ${response.status} - ${errorText}`);
            } else {
              console.log(`[Tiendanube] OK stock updated for product ${item.tiendanubeProductId}: ${product.stock} → ${newStock}`);
            }
          } catch (err: any) {
            console.error(`[Tiendanube] FETCH ERROR product ${item.tiendanubeProductId}:`, err.message);
          }
        }

        // Actualizar stock local
        await db.update(products).set({ stock: newStock })
          .where(eq(products.id, product.id));
      }

      // Actualizar estado del pedido con numero de remito
      await db.update(orders).set({ status: "approved", remitoNumber })
        .where(eq(orders.id, input.id));

      // === MONEDAS DE ORO: calcular y asignar al revendedor ===
      try {
        const orderData = await db.select().from(orders).where(eq(orders.id, input.id));
        const order = orderData[0];
        if (order && order.status === "approved") {
          const orderTotal = Number(order.totalAmount);
          const paymentType = order.paymentType as "efectivo" | "transferencia";
          const earnedCoins = calculateGoldCoins(orderTotal, paymentType);

          if (earnedCoins > 0) {
            const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
            await db.insert(goldCoinTransactions).values({
              userId: order.userId,
              orderId: order.id,
              type: "earned",
              amount: earnedCoins,
              description: `Ganadas por pedido #${order.id} (${paymentType === "efectivo" ? "1%" : "0.5%"})`,
              monthKey,
            });
            await db.execute(sql`UPDATE users SET goldCoins = goldCoins + ${earnedCoins} WHERE id = ${order.userId}`);
          }
        }
      } catch {
        // Si falla el calculo de monedas, no bloqueamos la aprobacion
      }

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

      // NOTA: Sync automatico DESACTIVADO. Solo sync manual desde el panel de admin.
      // try {
      //   const { forceSyncAfterSale } = await import("./syncJob");
      //   forceSyncAfterSale().catch(() => {});
      // } catch {}

      return { success: true };
    }),

  /* ================================================================
     ADMIN: Rechazar pedido pendiente (devuelve stock a Tiendanube y local)
     Superadmin puede anular pedidos aprobados tambien
     ================================================================ */
  reject: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Verificar que el pedido existe
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id));
      if (!order) throw new Error("Pedido no encontrado");

      const isSuper = ctx.user.role === "superadmin";

      // Solo superadmin puede anular pedidos aprobados
      if (order.status === "approved" && !isSuper) {
        throw new Error("Solo el superadmin puede anular pedidos aprobados");
      }

      // Solo se pueden rechazar/anular pedidos aprobados o pendientes
      if (order.status !== "pending" && order.status !== "approved") {
        throw new Error("El pedido ya fue rechazado");
      }

      // Obtener items del pedido
      const items = await db.select().from(orderItems)
        .where(eq(orderItems.orderId, input.id));

      // Obtener configuracion de Tiendanube
      const [s] = await db.select().from(settings).limit(1);

      // Devolver stock a Tiendanube y local
      for (const item of items) {
        if (!item.tiendanubeProductId) continue;

        // Obtener producto local
        const prodRows = await db.select().from(products)
          .where(eq(products.tiendanubeId, item.tiendanubeProductId));
        if (prodRows.length === 0) continue;
        const product = prodRows[0];

        // Calcular nuevo stock local (devolvemos lo que se desconto)
        const restoredStock = (product.stock ?? 0) + item.quantity;

        // Actualizar stock local
        await db.update(products).set({ stock: restoredStock })
          .where(eq(products.id, product.id));

        // Devolver stock a Tiendanube (siempre, sin GET previo)
        if (s?.tiendanubeApiToken && s?.tiendanubeStoreId && product.tiendanubeVariantId) {
          try {
            // Usamos el stock local ya restaurado como fuente de verdad
            const putResponse = await fetch(
              `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products/${item.tiendanubeProductId}/variants/${product.tiendanubeVariantId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authentication": `bearer ${s.tiendanubeApiToken}`,
                  "User-Agent": "Portal-Revendedores/1.0",
                },
                body: JSON.stringify({ stock: restoredStock }),
              }
            );

            if (!putResponse.ok) {
              const errorText = await putResponse.text();
              console.error(`[Tiendanube Reject] ERROR product ${item.tiendanubeProductId}: ${putResponse.status} - ${errorText}`);
            } else {
              console.log(`[Tiendanube Reject] OK stock restored for product ${item.tiendanubeProductId}: ${product.stock} → ${restoredStock}`);
            }
          } catch (err: any) {
            console.error(`[Tiendanube Reject] FETCH ERROR product ${item.tiendanubeProductId}:`, err.message);
          }
        }
      }

      // Si el pedido ya estaba aprobado, revertir las monedas de oro ganadas
      if (order && order.status === "approved") {
        try {
          const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

          // Calcular monedas que se ganaron (para revertirlas)
          const orderTotal = Number(order.totalAmount);
          const paymentType = order.paymentType as "efectivo" | "transferencia";
          const earnedCoins = calculateGoldCoins(orderTotal, paymentType);

          if (earnedCoins > 0) {
            // Verificar que el usuario tenga suficientes monedas para quitar
            const [userRow] = await db.select({ goldCoins: users.goldCoins }).from(users).where(eq(users.id, order.userId));
            const coinsToRemove = Math.min(earnedCoins, userRow?.goldCoins ?? 0);

            if (coinsToRemove > 0) {
              await db.insert(goldCoinTransactions).values({
                userId: order.userId,
                orderId: order.id,
                type: "spent",
                amount: -coinsToRemove,
                description: `Revertidas por anulacion de pedido #${order.id}`,
                monthKey,
              });
              await db.execute(sql`UPDATE users SET goldCoins = GREATEST(0, goldCoins - ${coinsToRemove}) WHERE id = ${order.userId}`);
            }
          }
        } catch (err: any) {
          console.error(`[GoldCoins Revert] ERROR:`, err.message);
        }
      }

      // Marcar pedido como rechazado
      await db.update(orders).set({ status: "rejected" })
        .where(eq(orders.id, input.id));

      return { success: true, restoredItems: items.length };
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
     SUPERADMIN: Borrar historial de ventas (todos los pedidos)
     ================================================================ */
  clearHistory: superadminQuery
    .mutation(async () => {
      const db = getDb();
      // Primero borrar items, luego orders
      await db.execute(`DELETE FROM orderItems` as any);
      await db.execute(`DELETE FROM orders` as any);
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

  /* ================================================================
     ADMIN: Marcar pedido como pagado / pendiente
     ================================================================ */
  togglePaid: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id));
      if (!order || order.status !== "approved") throw new Error("Solo pedidos aprobados");

      const newPaid = !order.paid;
      await db.update(orders).set({ paid: newPaid }).where(eq(orders.id, input.id));
      return { paid: newPaid };
    }),

  /* ================================================================
     ADMIN: Listar pedidos del dia + pendientes de dias anteriores
     ================================================================ */
  dailyOrders: adminQuery.query(async () => {
    const db = getDb();

    // Obtener inicio del dia actual
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Pedidos aprobados de HOY (sin cerrar)
    const todayOrders = await db.select().from(orders)
      .where(
        and(
          eq(orders.status, "approved"),
          eq(orders.closed, false),
          gte(orders.createdAt, todayStart)
        )
      )
      .orderBy(desc(orders.createdAt));

    // Pedidos aprobados de DIAS ANTERIORES que estan pendientes de pago
    const oldPending = await db.select().from(orders)
      .where(
        and(
          eq(orders.status, "approved"),
          eq(orders.paid, false),
          eq(orders.closed, false),
          sql`${orders.createdAt} < ${todayStart}`
        )
      )
      .orderBy(desc(orders.createdAt));

    // Combinar y obtener datos de usuarios
    const allOrders = [...todayOrders, ...oldPending];
    if (allOrders.length === 0) return [];

    const userIds = [...new Set(allOrders.map(o => o.userId))];
    const allUsers = await db.select().from(users).where(sql`${users.id} IN (${userIds.join(",")})`);
    const userById: Record<number, typeof allUsers[0]> = {};
    for (const u of allUsers) userById[u.id] = u;

    // Obtener items
    const orderIds = allOrders.map(o => o.id);
    const allItems = await db.select().from(orderItems);
    const itemsFiltered = allItems.filter(item => orderIds.includes(item.orderId));
    const itemsByOrder: Record<number, typeof allItems> = {};
    for (const item of itemsFiltered) {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    }

    return allOrders.map(o => ({
      ...o,
      revendedorName: userById[o.userId]?.name ?? "Desconocido",
      revendedorEmail: userById[o.userId]?.email ?? "",
      items: itemsByOrder[o.id] || [],
      isOld: new Date(o.createdAt) < todayStart,
    }));
  }),

  /* ================================================================
     ADMIN: Cerrar caja del dia
     ================================================================ */
  closeDaily: adminQuery
    .input(z.object({ note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Obtener pedidos abiertos (approved, no cerrados)
      const openOrders = await db.select().from(orders)
        .where(and(eq(orders.status, "approved"), eq(orders.closed, false)));

      if (openOrders.length === 0) throw new Error("No hay pedidos para cerrar");

      // Calcular totales
      let totalCash = 0;
      let totalTransfer = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let totalDiscountCoins = 0;
      let totalReal = 0;

      for (const order of openOrders) {
        const orderReal = Math.max(0, Number(order.totalAmount) - Number(order.discountPesos));
        totalReal += orderReal;
        totalDiscountCoins += Number(order.discountPesos);

        if (order.paymentType === "efectivo") totalCash += orderReal;
        else totalTransfer += orderReal;

        if (order.paid) paidCount++;
        else pendingCount++;
      }

      const totalAmount = openOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

      // Crear cierre
      await db.execute(
        `INSERT INTO dailyClosures (adminId, totalAmount, totalReal, totalDiscountCoins, totalOrders, paidOrders, pendingOrders, totalCash, totalTransfer) VALUES (${ctx.user.id}, ${totalAmount.toFixed(2)}, ${totalReal.toFixed(2)}, ${totalDiscountCoins.toFixed(2)}, ${openOrders.length}, ${paidCount}, ${pendingCount}, ${totalCash.toFixed(2)}, ${totalTransfer.toFixed(2)})` as any
      );

      // Marcar todos los pedidos como cerrados
      const orderIds = openOrders.map(o => o.id);
      await db.execute(`UPDATE orders SET closed = TRUE WHERE id IN (${orderIds.join(",")})` as any);

      return {
        totalAmount,
        totalOrders: openOrders.length,
        paidCount,
        pendingCount,
        totalCash,
        totalTransfer,
      };
    }),

  /* ================================================================
     ADMIN: Historial de cierres de caja
     ================================================================ */
  closureHistory: adminQuery.query(async () => {
    const db = getDb();
    const closures = await db.execute(
      `SELECT d.*, u.name as adminName FROM dailyClosures d JOIN users u ON d.adminId = u.id ORDER BY d.createdAt DESC LIMIT 50` as any
    );
    return (closures as any)[0] ?? [];
  }),
});
