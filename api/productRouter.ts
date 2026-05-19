import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products } from "@db/schema";
import { eq, and, or, like } from "drizzle-orm";

export const productRouter = createRouter({
  list: publicQuery.query(async () => {
    return getDb().select().from(products).where(eq(products.active, true)).orderBy(products.category, products.name);
  }),

  search: publicQuery.input(z.object({ query: z.string() })).query(async ({ input }) => {
    return getDb().select().from(products).where(and(
      or(like(products.name, `%${input.query}%`), like(products.category, `%${input.query}%`)),
      eq(products.active, true)
    ));
  }),

  create: adminQuery.input(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    priceList: z.number().positive(),
    stock: z.number().int().min(0).default(0),
  })).mutation(async ({ input }) => {
    const priceCash30 = (input.priceList * 0.7).toFixed(2);
    const priceTransfer25 = (input.priceList * 0.75).toFixed(2);
    const result = await getDb().insert(products).values({
      name: input.name,
      category: input.category,
      priceList: input.priceList.toFixed(2),
      priceCash30,
      priceTransfer25,
      stock: input.stock,
      active: true,
    }).$returningId();
    return { id: result[0]?.id };
  }),

  delete: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await getDb().delete(products).where(eq(products.id, input.id));
    return { success: true };
  }),

  clearAll: adminQuery.mutation(async () => {
    await getDb().delete(products);
    return { success: true };
  }),

  updateCategory: adminQuery
    .input(z.object({ id: z.number(), category: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await getDb().update(products).set({ category: input.category }).where(eq(products.id, input.id));
      return { success: true };
    }),
});
