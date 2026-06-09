import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products } from "@db/schema";
import { eq, and, or, like } from "drizzle-orm";

export const productRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const [rows] = await db.execute(`
      SELECT id, name, category, priceList, priceCash30, priceTransfer25, stock, 
             imageUrl, tiendanubeId, tiendanubeVariantId, slug, active, 
             createdAt, updatedAt, location, location_type 
      FROM products 
      WHERE active = true 
      ORDER BY category, name
    `);
    return rows;
  }),

  search: publicQuery.input(z.object({ query: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const [rows] = await db.execute(`
      SELECT * FROM products 
      WHERE (name LIKE '%${input.query}%' OR category LIKE '%${input.query}%') 
      AND active = true
    `);
    return rows;
  }),

  create: adminQuery.input(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    priceList: z.number().positive(),
    stock: z.number().int().min(0).default(0),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const priceCash30 = (input.priceList * 0.7).toFixed(2);
    const priceTransfer25 = (input.priceList * 0.75).toFixed(2);
    const [result] = await db.execute(`
      INSERT INTO products (name, category, priceList, priceCash30, priceTransfer25, stock, active) 
      VALUES ('${input.name}', '${input.category}', ${input.priceList}, ${priceCash30}, ${priceTransfer25}, ${input.stock}, 1)
    `);
    return { id: (result as any).insertId };
  }),

  delete: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.execute(`DELETE FROM products WHERE id = ${input.id}`);
    return { success: true };
  }),

  clearAll: adminQuery.mutation(async () => {
    const db = getDb();
    await db.execute(`DELETE FROM products`);
    return { success: true };
  }),

  updateCategory: adminQuery
    .input(z.object({ id: z.number(), category: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`UPDATE products SET category = '${input.category}' WHERE id = ${input.id}`);
      return { success: true };
    }),

  updateLocation: adminQuery
    .input(z.object({ id: z.number(), location: z.string().max(10).nullable() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`UPDATE products SET location = '${input.location || ''}' WHERE id = ${input.id}`);
      return { success: true };
    }),
});
