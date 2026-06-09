import { z } from "zod";
import { createRouter, publicQuery, adminQuery, authedQuery } from "./middleware";
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

  /* ================================================================
     OFERTAS DE LA SEMANA - Productos destacados por admin con precio de oferta
     ================================================================ */
  featured: publicQuery.query(async () => {
    const db = getDb();
    const [rows] = await db.execute(`
      SELECT 
        p.id, p.name, p.category, p.priceList, p.priceCash30, p.priceTransfer25, 
        p.stock, p.imageUrl, p.slug, p.viewCount,
        fd.dealPrice, fd.dealType, fd.displayOrder
      FROM products p
      JOIN featuredDeals fd ON p.id = fd.productId
      WHERE p.active = true
      ORDER BY fd.displayOrder ASC, fd.createdAt DESC
      LIMIT 20
    `);
    return rows;
  }),

  /* ================================================================
     NOVEDADES - Productos nuevos (últimos 30 días o is_new)
     ================================================================ */
  newArrivals: publicQuery.query(async () => {
    const db = getDb();
    const [rows] = await db.execute(`
      SELECT id, name, category, priceList, priceCash30, priceTransfer25, stock,
             imageUrl, slug, is_new, createdAt
      FROM products
      WHERE active = true AND (is_new = true OR createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY))
      ORDER BY createdAt DESC
      LIMIT 30
    `);
    return rows;
  }),

  /* ================================================================
     RECOMENDACIONES - Basadas en historial del usuario (ML style)
     ================================================================ */
  recommendations: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    // 1. Obtener categorías más vistas/compradas por el usuario
    const [topCategories] = await db.execute(`
      SELECT category, count FROM userCategoryViews
      WHERE userId = ${userId}
      ORDER BY count DESC
      LIMIT 3
    `);

    const cats = (topCategories as any[]).map((c: any) => c.category);

    // 2. Obtener productos que el usuario ya compró o vió (para excluirlos)
    const [seenProducts] = await db.execute(`
      SELECT productId FROM userInteractions
      WHERE userId = ${userId}
    `);
    const seenIds = (seenProducts as any[]).map((p: any) => p.productId).join(",");

    let query = `
      SELECT id, name, category, priceList, priceCash30, priceTransfer25, stock,
             imageUrl, slug, viewCount
      FROM products
      WHERE active = true
    `;

    // Si tenemos categorías preferidas, priorizarlas
    if (cats.length > 0) {
      const catList = cats.map(c => `'${c}'`).join(",");
      query += ` AND category IN (${catList})`;
    }

    // Excluir productos ya vistos/comprados
    if (seenIds) {
      query += ` AND id NOT IN (${seenIds})`;
    }

    query += ` ORDER BY viewCount DESC, createdAt DESC LIMIT 20`;

    const [rows] = await db.execute(query);

    // Si no hay suficientes resultados, completar con populares
    if ((rows as any[]).length < 10) {
      const [popular] = await db.execute(`
        SELECT id, name, category, priceList, priceCash30, priceTransfer25, stock,
               imageUrl, slug, viewCount
        FROM products
        WHERE active = true
        ${seenIds ? `AND id NOT IN (${seenIds})` : ""}
        ORDER BY viewCount DESC, createdAt DESC
        LIMIT 20
      `);
      return popular;
    }

    return rows;
  }),

  /* ================================================================
     ADD DEAL - Agregar producto a ofertas (admin)
     ================================================================ */
  addDeal: adminQuery
    .input(z.object({
      productId: z.number(),
      dealPrice: z.number().positive(),
      dealType: z.enum(["cash", "transfer"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`
        INSERT INTO featuredDeals (productId, dealPrice, dealType, displayOrder)
        VALUES (${input.productId}, ${input.dealPrice.toFixed(2)}, '${input.dealType || "cash"}',
          (SELECT COALESCE(MAX(displayOrder), 0) + 1 FROM featuredDeals fd2))
        ON DUPLICATE KEY UPDATE
          dealPrice = ${input.dealPrice.toFixed(2)},
          dealType = '${input.dealType || "cash"}'
      `);
      return { success: true };
    }),

  /* ================================================================
     REMOVE DEAL - Quitar producto de ofertas (admin)
     ================================================================ */
  removeDeal: adminQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`DELETE FROM featuredDeals WHERE productId = ${input.productId}`);
      return { success: true };
    }),

  /* ================================================================
     UPDATE DEAL PRICE - Cambiar precio de una oferta (admin)
     ================================================================ */
  updateDealPrice: adminQuery
    .input(z.object({
      productId: z.number(),
      dealPrice: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`
        UPDATE featuredDeals SET dealPrice = ${input.dealPrice.toFixed(2)}
        WHERE productId = ${input.productId}
      `);
      return { success: true };
    }),

  /* ================================================================
     REORDER DEALS - Cambiar orden de ofertas (admin)
     ================================================================ */
  reorderDeals: adminQuery
    .input(z.object({
      orders: z.array(z.object({ productId: z.number(), order: z.number() })),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const item of input.orders) {
        await db.execute(`
          UPDATE featuredDeals SET displayOrder = ${item.order}
          WHERE productId = ${item.productId}
        `);
      }
      return { success: true };
    }),

  /* ================================================================
     CLEAR NEW FLAG - Marcar novedades como ya vistas (admin)
     ================================================================ */
  clearNewFlag: adminQuery.mutation(async () => {
    const db = getDb();
    await db.execute(`UPDATE products SET is_new = false WHERE is_new = true`);
    return { success: true };
  }),

  /* ================================================================
     TRACK INTERACTION - Registrar view/purchase/cart del usuario
     ================================================================ */
  trackInteraction: authedQuery
    .input(z.object({
      productId: z.number(),
      type: z.enum(["view", "purchase", "cart"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Insert or update interaction count
      await db.execute(`
        INSERT INTO userInteractions (userId, productId, type, count)
        VALUES (${userId}, ${input.productId}, '${input.type}', 1)
        ON DUPLICATE KEY UPDATE count = count + 1
      `);

      // Si es view, también incrementar viewCount del producto
      if (input.type === "view") {
        await db.execute(`
          UPDATE products SET viewCount = viewCount + 1 WHERE id = ${input.productId}
        `);
      }

      // Si tiene categoría, registrar categoría vista
      if (input.type === "view" || input.type === "purchase") {
        const [product] = await db.execute(`
          SELECT category FROM products WHERE id = ${input.productId}
        `);
        const category = (product as any[])[0]?.category;
        if (category) {
          await db.execute(`
            INSERT INTO userCategoryViews (userId, category, count)
            VALUES (${userId}, '${category}', 1)
            ON DUPLICATE KEY UPDATE count = count + 1
          `);
        }
      }

      return { success: true };
    }),
});
