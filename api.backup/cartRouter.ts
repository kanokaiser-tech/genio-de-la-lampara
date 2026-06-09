import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cartItems, products, users } from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

  /* ================================================================
     ADMIN: Ver carritos de revendedores
     ================================================================ */
  adminList: adminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const isSuper = ctx.user.role === "superadmin";

    // Obtener revendedores segun rol
    let revendedores;
    if (isSuper) {
      revendedores = await db.select().from(users).where(eq(users.role, "revendedor"));
    } else {
      // Admin ve sus revendedores (parentId = admin.id) y tambien los de otros admins
      revendedores = await db.select().from(users).where(eq(users.role, "revendedor"));
    }

    if (revendedores.length === 0) return [];

    const revIds = revendedores.map(r => r.id);

    // Obtener carritos de esos revendedores
    const allCartItems = await db.select().from(cartItems);
    const cartFiltered = allCartItems.filter(c => revIds.includes(c.userId));

    if (cartFiltered.length === 0) return [];

    // Obtener productos
    const productIds = [...new Set(cartFiltered.map(c => c.productId))];
    const allProducts = await db.select().from(products);
    const prodById: Record<number, typeof allProducts[0]> = {};
    for (const p of allProducts) prodById[p.id] = p;

    // Agrupar por revendedor
    const cartsByRev: Record<number, typeof cartFiltered> = {};
    for (const c of cartFiltered) {
      if (!cartsByRev[c.userId]) cartsByRev[c.userId] = [];
      cartsByRev[c.userId].push(c);
    }

    // Construir resultado
    const result = [];
    for (const rev of revendedores) {
      const items = cartsByRev[rev.id] || [];
      if (items.length === 0) continue;
      result.push({
        revendedor: rev,
        items: items.map(item => ({
          ...item,
          product: prodById[item.productId] ?? null,
        })),
      });
    }

    return result;
  }),

  adminUpdate: adminQuery
    .input(z.object({ userId: z.number(), productId: z.number(), quantity: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.quantity <= 0) {
        await db.delete(cartItems).where(and(eq(cartItems.userId, input.userId), eq(cartItems.productId, input.productId)));
      } else {
        await db.update(cartItems).set({ quantity: input.quantity }).where(and(eq(cartItems.userId, input.userId), eq(cartItems.productId, input.productId)));
      }
      return { success: true };
    }),

  adminRemove: adminQuery
    .input(z.object({ userId: z.number(), productId: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(cartItems).where(and(eq(cartItems.userId, input.userId), eq(cartItems.productId, input.productId)));
      return { success: true };
    }),

  adminAdd: adminQuery
    .input(z.object({ userId: z.number(), productId: z.number(), quantity: z.number().int().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(cartItems).where(and(eq(cartItems.userId, input.userId), eq(cartItems.productId, input.productId))).limit(1);
      if (existing[0]) {
        await db.update(cartItems).set({ quantity: existing[0].quantity + input.quantity }).where(eq(cartItems.id, existing[0].id));
      } else {
        await db.insert(cartItems).values({ userId: input.userId, productId: input.productId, quantity: input.quantity });
      }
      return { success: true };
    }),
});
