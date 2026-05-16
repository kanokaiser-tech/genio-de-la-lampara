import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, cartItems, products } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const orderRouter = createRouter({
  myOrders: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(orders).where(eq(orders.userId, ctx.user.id)).orderBy(desc(orders.createdAt));
  }),

  myOrdersAsAdmin: adminQuery.query(async ({ ctx }) => {
    return getDb().select().from(orders).where(eq(orders.adminId, ctx.user.id)).orderBy(desc(orders.createdAt));
  }),

  pendingOrders: adminQuery.query(async ({ ctx }) => {
    return getDb().select().from(orders).where(and(eq(orders.adminId, ctx.user.id), eq(orders.status, "pending"))).orderBy(desc(orders.createdAt));
  }),

  byId: authedQuery.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const [order] = await getDb().select().from(orders).where(eq(orders.id, input.id)).limit(1);
    if (!order) return null;
    if (order.userId !== ctx.user.id && order.adminId !== ctx.user.id) return null;
    const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, input.id));
    return { ...order, items };
  }),

  create: authedQuery.input(z.object({
    paymentType: z.enum(["efectivo", "transferencia"]),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const cart = await getDb().select().from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.userId, ctx.user.id));
    if (cart.length === 0) throw new Error("Carrito vacio");

    const adminId = ctx.user.role === "revendedor" ? (ctx.user.parentId ?? 1) : ctx.user.id;

    const priceField = input.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";
    let total = 0;

    const orderItemsData = cart.map((item) => {
      const price = Number(item.products[priceField]);
      const subtotal = price * item.cartItems.quantity;
      total += subtotal;
      return {
        productId: item.cartItems.productId,
        productName: item.products.name,
        quantity: item.cartItems.quantity,
        price: price.toFixed(2),
        subtotal: subtotal.toFixed(2),
      };
    });

    const [result] = await getDb().insert(orders).values({
      userId: ctx.user.id,
      adminId,
      status: "pending",
      paymentType: input.paymentType,
      notes: input.notes ?? null,
      totalAmount: total.toFixed(2),
    }).$returningId();

    const orderId = result!.id;

    for (const item of orderItemsData) {
      await getDb().insert(orderItems).values({ ...item, orderId });
    }

    await getDb().delete(cartItems).where(eq(cartItems.userId, ctx.user.id));

    return { orderId };
  }),

  approve: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const [order] = await getDb().select().from(orders).where(eq(orders.id, input.id)).limit(1);
    if (!order || order.adminId !== ctx.user.id) throw new Error("No autorizado");

    await getDb().update(orders).set({ status: "approved" }).where(eq(orders.id, input.id));

    // Send webhook
    try {
      const settingsRows = await getDb().select().from(await import("@db/schema").then(m => m.settings));
      const webhookUrl = settingsRows[0]?.webhookUrl;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "order.approved", orderId: input.id }),
        });
      }
    } catch { /* ignore */ }

    return { success: true };
  }),

  reject: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const [order] = await getDb().select().from(orders).where(eq(orders.id, input.id)).limit(1);
    if (!order || order.adminId !== ctx.user.id) throw new Error("No autorizado");
    await getDb().update(orders).set({ status: "rejected" }).where(eq(orders.id, input.id));
    return { success: true };
  }),
});
