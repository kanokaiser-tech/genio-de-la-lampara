import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, products } from "@db/schema";
import { sql, inArray } from "drizzle-orm";

interface TnProduct {
  id: number;
  name: Record<string, string> | string;
  handle?: Record<string, string> | string;
  variants?: Array<{ price?: number | string }>;
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
      const variantPrice = parseFloat(String(tnProduct.variants?.[0]?.price ?? 0));
      const originalPrice = isNaN(variantPrice) ? 0 : variantPrice;
      const priceCash30 = Math.round(originalPrice * 0.7 * 100) / 100;
      const priceTransfer25 = Math.round(originalPrice * 0.75 * 100) / 100;
      const inStock = tnProduct.published ?? true;
      const imageUrl = tnProduct.images?.[0]?.src ?? null;

      if (!slug) continue;
      seenSlugs.push(slug);

      await getDb().execute(sql`
        INSERT INTO products (name, priceList, priceCash30, priceTransfer25, category, stock, imageUrl, slug, tiendanubeId, active)
        VALUES (${name}, ${originalPrice.toFixed(2)}, ${priceCash30.toFixed(2)}, ${priceTransfer25.toFixed(2)}, ${category}, ${inStock ? 1 : 0}, ${imageUrl}, ${slug}, ${String(tnProduct.id)}, TRUE)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          priceList = VALUES(priceList),
          priceCash30 = VALUES(priceCash30),
          priceTransfer25 = VALUES(priceTransfer25),
          category = VALUES(category),
          stock = VALUES(stock),
          imageUrl = VALUES(imageUrl),
          tiendanubeId = VALUES(tiendanubeId),
          active = TRUE
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
