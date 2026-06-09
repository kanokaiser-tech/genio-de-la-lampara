import { z } from "zod";
import { createRouter, authedQuery, adminQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { moderateWithDeepSeek } from "./deepseekModeration";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

function deleteImageFiles(imageUrls: string) {
  if (!imageUrls) return;
  try {
    const urls = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
    if (Array.isArray(urls)) {
      urls.forEach((url: string) => {
        const filename = url.replace("/uploads/", "");
        const filepath = join(process.cwd(), "public", "uploads", filename);
        if (existsSync(filepath)) {
          unlinkSync(filepath);
        }
      });
    }
  } catch (e) {}
}

export const vendorProductRouter = createRouter({
  publish: authedQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      stock: z.number().int().min(0).default(0),
      category: z.string().optional(),
      imageUrls: z.array(z.string()).optional().default([]),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      const searchTerm = `%${input.name}%`;
      const [existingProducts] = await db.execute(
        `SELECT id FROM products WHERE name LIKE '${searchTerm.replace(/'/g, "''")}' AND active = true LIMIT 1`
      );
      
      if ((existingProducts as any[]).length > 0) {
        return { success: false, status: "rejected", message: "Este producto ya está en nuestro catálogo." };
      }
      
      const moderation = await moderateWithDeepSeek(input.name, input.description || "", input.category);
      const status = moderation.approved ? "approved" : "pending";
      const rejectionReason = moderation.approved ? null : `IA sugiere revisión: ${moderation.reason}`;
      
      const phone = input.phone || ctx.user.phone || "";
      const imagesJson = JSON.stringify(input.imageUrls);
      
      const [result] = await db.execute(
        `INSERT INTO vendor_products 
        (user_id, title, description, price, category, images, status, rejection_reason, vendor_phone, created_at) 
        VALUES (${ctx.user.id}, '${input.name.replace(/'/g, "''")}', '${(input.description || '').replace(/'/g, "''")}', ${input.price}, '${(input.category || '').replace(/'/g, "''")}', '${imagesJson}', '${status}', ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : 'NULL'}, '${phone}', NOW())`
      );
      
      return { id: (result as any).insertId, success: true, status, message: status === "approved" ? "Producto aprobado" : "Pendiente de revisión" };
    }),

  list: publicQuery
    .input(z.object({ category: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      let query = `SELECT vp.*, u.name as vendorName, u.phone as userPhone 
                   FROM vendor_products vp 
                   JOIN users u ON vp.user_id = u.id 
                   WHERE vp.status = 'approved' AND vp.sold = 0`;
      
      if (input?.category) query += ` AND vp.category = '${input.category.replace(/'/g, "''")}'`;
      if (input?.search) query += ` AND vp.title LIKE '%${input.search.replace(/'/g, "''")}%'`;
      query += ` ORDER BY vp.created_at DESC`;
      
      const [rows] = await db.execute(query);
      return rows;
    }),

  myProducts: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [rows] = await db.execute(
      `SELECT * FROM vendor_products WHERE user_id = ${ctx.user.id} ORDER BY created_at DESC`
    );
    return rows;
  }),

  adminList: adminQuery.query(async () => {
    const db = getDb();
    const [rows] = await db.execute(
      `SELECT vp.*, u.name as vendorName, u.email as vendorEmail, u.phone as userPhone 
       FROM vendor_products vp 
       JOIN users u ON vp.user_id = u.id 
       ORDER BY vp.created_at DESC`
    );
    return rows;
  }),

  approve: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.execute(`UPDATE vendor_products SET status = 'approved', rejection_reason = NULL WHERE id = ${input.id}`);
    return { success: true };
  }),

  reject: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.execute(`UPDATE vendor_products SET status = 'rejected' WHERE id = ${input.id}`);
    return { success: true };
  }),

  markAsSold: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [rows] = await db.execute(`SELECT user_id FROM vendor_products WHERE id = ${input.id}`);
    const product = (rows as any[])[0];
    if (!product) throw new Error('Producto no encontrado');
    if (product.user_id !== ctx.user.id && !ctx.user.isAdmin) throw new Error('No autorizado');
    await db.execute(`UPDATE vendor_products SET sold = 1 WHERE id = ${input.id}`);
    return { success: true };
  }),

  delete: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [rows] = await db.execute(`SELECT user_id, images FROM vendor_products WHERE id = ${input.id}`);
    const product = (rows as any[])[0];
    if (!product) throw new Error('Producto no encontrado');
    if (product.user_id !== ctx.user.id && !ctx.user.isAdmin) throw new Error('No autorizado');
    if (product.images) deleteImageFiles(product.images);
    await db.execute(`DELETE FROM vendor_products WHERE id = ${input.id}`);
    return { success: true };
  }),
});
