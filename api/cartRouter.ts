import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cartItems, products } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const cartRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.userId, ctx.user.id));
  }),

  add: authedQuery.input(z.object({ productId: z.number(), quantity: z.number().int().min(1) })).mutation(async ({ ctx, input }) => {
    const existing = await getDb().select().from(cartItems).where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId))).limit(1);
    if (existing[0]) {
      await getDb().update(cartItems).set({ quantity: existing[0].quantity + input.quantity }).where(eq(cartItems.id, existing[0].id));
    } else {
      await getDb().insert(cartItems).values({ userId: ctx.user.id, productId: input.productId, quantity: input.quantity });
    }
    return { success: true };
  }),

  updateQuantity: authedQuery.input(z.object({ productId: z.number(), quantity: z.number().int().min(0) })).mutation(async ({ ctx, input }) => {
    if (input.quantity <= 0) {
      await getDb().delete(cartItems).where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)));
    } else {
      await getDb().update(cartItems).set({ quantity: input.quantity }).where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)));
    }
    return { success: true };
  }),

  remove: authedQuery.input(z.object({ productId: z.number() })).mutation(async ({ ctx, input }) => {
    await getDb().delete(cartItems).where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)));
    return { success: true };
  }),

  clear: authedQuery.mutation(async ({ ctx }) => {
    await getDb().delete(cartItems).where(eq(cartItems.userId, ctx.user.id));
    return { success: true };
  }),
});
