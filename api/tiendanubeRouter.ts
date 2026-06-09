import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, products } from "@db/schema";
import { sql, inArray, eq } from "drizzle-orm";

interface TnProduct {
  id: number;
  name: Record<string, string> | string;
  handle?: Record<string, string> | string;
  variants?: Array<{ id?: number; price?: number | string; stock?: number | null }>;
  categories?: Array<{ name: Record<string, string> | string }>;
  images?: Array<{ src?: string }>;
  published?: boolean;
}

function getTranslation(val: Record<string, string> | string | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val["es"] ?? val["en"] ?? val["pt"] ?? Object.values(val)[0] ?? "";
}

export const tiendanubeRouter = createRouter({
  sync: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) {
      throw new Error("Faltan credenciales de Tiendanube.");
    }

    // Ensure slug column exists
    try {
      await getDb().execute(sql`ALTER TABLE products ADD COLUMN slug VARCHAR(500) UNIQUE`);
    } catch { /* column may already exist */ }

    // Remove old tiendanubeId-based products that don't have a slug
    try {
      await getDb().execute(sql`DELETE FROM products WHERE slug IS NULL OR slug = ''`);
    } catch { /* ignore */ }

    const storeId = s.tiendanubeStoreId;
    const apiToken = s.tiendanubeApiToken;

    // === ETAPA 1: Traer todos los productos paginados ===
    let page = 1;
    let hasMore = true;
    const allProducts: TnProduct[] = [];

    while (hasMore) {
      const resp = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/products?per_page=200&page=${page}`,
        {
          headers: {
            Authentication: `bearer ${apiToken}`,
            "User-Agent": "Portal-Revendedores/1.0",
          },
        }
      );

      if (!resp.ok) {
        const err = await resp.text().catch(() => "");
        throw new Error(`Tiendanube API error ${resp.status}: ${err.substring(0, 200)}`);
      }

      const batch = (await resp.json()) as TnProduct[];
      allProducts.push(...batch);
      page++;
      if (batch.length < 200) hasMore = false;
    }

    if (allProducts.length === 0) {
      return { imported: 0, deleted: 0 };
    }

    // === ETAPA 2: Upsert cada producto ===
    const seenSlugs: string[] = [];
    let imported = 0;

    for (const tnProduct of allProducts) {
      const name = getTranslation(tnProduct.name);
      const slug = getTranslation(tnProduct.handle);
      const category = getTranslation(tnProduct.categories?.[0]?.name);
      const firstVariant = tnProduct.variants?.[0];
      const variantPrice = parseFloat(String(firstVariant?.price ?? 0));
      const originalPrice = isNaN(variantPrice) ? 0 : variantPrice;
      const priceCash30 = Math.round(originalPrice * 0.7 * 100) / 100;
      const priceTransfer25 = Math.round(originalPrice * 0.75 * 100) / 100;
      const tnStock = firstVariant?.stock ?? (tnProduct.published ? 999 : 0);
      const imageUrl = tnProduct.images?.[0]?.src ?? null;
      const variantId = firstVariant?.id ? String(firstVariant.id) : null;

      if (!slug) continue;
      seenSlugs.push(slug);

      await getDb().execute(sql`
        INSERT INTO products (name, priceList, priceCash30, priceTransfer25, category, stock, imageUrl, slug, tiendanubeId, tiendanubeVariantId, active, is_new)
        VALUES (${name}, ${originalPrice.toFixed(2)}, ${priceCash30.toFixed(2)}, ${priceTransfer25.toFixed(2)}, ${category}, ${tnStock}, ${imageUrl}, ${slug}, ${String(tnProduct.id)}, ${variantId}, TRUE, TRUE)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          priceList = VALUES(priceList),
          priceCash30 = VALUES(priceCash30),
          priceTransfer25 = VALUES(priceTransfer25),
          category = VALUES(category),
          stock = VALUES(stock),
          imageUrl = VALUES(imageUrl),
          tiendanubeId = VALUES(tiendanubeId),
          tiendanubeVariantId = VALUES(tiendanubeVariantId),
          active = TRUE
          -- NO actualizamos is_new para que los existentes mantengan su valor
      `);
      imported++;
    }

    // === ETAPA 3: Eliminar los que ya no estan en Tiendanube ===
    let deleted = 0;
    if (seenSlugs.length > 0) {
      const slugsSet = new Set(seenSlugs);
      // Get all existing slugs
      const existingSlugs = await getDb()
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(sql`${products.slug} IS NOT NULL`);

      const toDelete: number[] = [];
      for (const row of existingSlugs) {
        if (row.slug && !slugsSet.has(row.slug)) {
          toDelete.push(row.id);
        }
      }

      // Delete in batches of 50
      const batchSize = 50;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        await getDb().delete(products).where(inArray(products.id, batch));
      }
      deleted = toDelete.length;
    }

    return { imported, deleted };
  }),

  /* ================================================================
     UPDATE STOCK - Actualiza stock de un producto en Tiendanube
     ================================================================ */
  updateStock: adminQuery
    .input(z.object({
      productId: z.string(),
      variantId: z.string(),
      newStock: z.number().int().min(0),
    }))
    .mutation(async ({ input }) => {
      const [s] = await getDb().select().from(settings).limit(1);
      if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) {
        throw new Error("Tiendanube no configurado");
      }
      try {
        const resp = await fetch(
          `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products/${input.productId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authentication: `bearer ${s.tiendanubeApiToken}`,
              "User-Agent": "Portal-Revendedores/1.0",
            },
            body: JSON.stringify({
              variants: [{ id: Number(input.variantId), stock: input.newStock }],
            }),
          }
        );
        if (!resp.ok) throw new Error(`Tiendanube error: ${resp.status}`);

        // Actualizar stock local tambien
        await getDb().execute(
          sql`UPDATE products SET stock = ${input.newStock} WHERE tiendanubeId = ${input.productId} AND tiendanubeVariantId = ${input.variantId}`
        );

        return { success: true, newStock: input.newStock };
      } catch (e: any) {
        throw new Error("Error al actualizar stock en Tiendanube: " + e.message);
      }
    }),

  /* ================================================================
     DELETE PRODUCT - Elimina un producto de Tiendanube y de la app
     ================================================================ */
  deleteProduct: adminQuery
    .input(z.object({
      productId: z.number(), // ID interno de la tabla products
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Obtener datos del producto
      const rows = await db.select().from(products).where(eq(products.id, input.productId));
      if (rows.length === 0) throw new Error("Producto no encontrado");
      const product = rows[0];

      // Si tiene tiendanubeId, eliminar de Tiendanube primero
      if (product.tiendanubeId) {
        const [s] = await db.select().from(settings).limit(1);
        if (s?.tiendanubeApiToken && s?.tiendanubeStoreId) {
          try {
            const resp = await fetch(
              `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products/${product.tiendanubeId}`,
              {
                method: "DELETE",
                headers: {
                  Authentication: `bearer ${s.tiendanubeApiToken}`,
                  "User-Agent": "Portal-Revendedores/1.0",
                },
              }
            );
            if (!resp.ok) throw new Error(`Tiendanube error: ${resp.status}`);
          } catch (e: any) {
            throw new Error("Error al eliminar de Tiendanube: " + e.message);
          }
        }
      }

      // Eliminar de la base de datos local
      await db.delete(products).where(eq(products.id, input.productId));

      return { success: true };
    }),

  test: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) return { ok: false };
    try {
      const resp = await fetch(
        `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?per_page=1`,
        {
          headers: {
            Authentication: `bearer ${s.tiendanubeApiToken}`,
            "User-Agent": "Portal-Revendedores/1.0",
          },
        }
      );
      return { ok: resp.ok };
    } catch {
      return { ok: false };
    }
  }),
});
