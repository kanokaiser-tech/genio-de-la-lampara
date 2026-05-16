import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts,
  getCategories,
  upsertProductByTiendanubeId,
} from "./queries/products";

export const productRouter = createRouter({
  // List all active products - public for landing, authed for app
  list: publicQuery.query(async () => {
    return getAllProducts();
  }),

  // Get single product
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getProductById(input.id);
    }),

  // Search products
  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return searchProducts(input.query);
    }),

  // Get all categories
  categories: publicQuery.query(async () => {
    return getCategories();
  }),

  // Create product - admin only
  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        priceList: z.number().positive(),
        stock: z.number().int().min(0).default(0),
        imageUrl: z.string().optional(),
        tiendanubeId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const priceCash30 = input.priceList * 0.7;
      const priceTransfer25 = input.priceList * 0.75;
      const id = await createProduct({
        name: input.name,
        category: input.category,
        priceList: input.priceList.toFixed(2),
        priceCash30: priceCash30.toFixed(2),
        priceTransfer25: priceTransfer25.toFixed(2),
        stock: input.stock,
        imageUrl: input.imageUrl ?? null,
        tiendanubeId: input.tiendanubeId ?? null,
        active: true,
      });
      return { id };
    }),

  // Update product - admin only
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        priceList: z.number().positive().optional(),
        stock: z.number().int().min(0).optional(),
        imageUrl: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };

      // Recalculate discount prices if priceList changed
      if (data.priceList !== undefined) {
        updateData.priceCash30 = (data.priceList * 0.7).toFixed(2);
        updateData.priceTransfer25 = (data.priceList * 0.75).toFixed(2);
      }

      await updateProduct(id, updateData);
      return { success: true };
    }),

  // Delete product - admin only
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
      return { success: true };
    }),

  // Clear all products - admin only
  clearAll: adminQuery.mutation(async () => {
    await clearAllProducts();
    return { success: true };
  }),

  // Upsert from Tiendanube import
  upsertFromTiendanube: adminQuery
    .input(
      z.object({
        tiendanubeId: z.string(),
        name: z.string(),
        category: z.string(),
        priceList: z.number(),
        stock: z.number(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { tiendanubeId, ...data } = input;
      const priceCash30 = data.priceList * 0.7;
      const priceTransfer25 = data.priceList * 0.75;
      const id = await upsertProductByTiendanubeId(tiendanubeId, {
        name: data.name,
        category: data.category,
        priceList: data.priceList.toFixed(2),
        stock: data.stock,
        imageUrl: data.imageUrl ?? null,
        tiendanubeId,
        priceCash30: priceCash30.toFixed(2),
        priceTransfer25: priceTransfer25.toFixed(2),
        active: true,
      });
      return { id };
    }),
});
