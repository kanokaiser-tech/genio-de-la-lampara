import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, products } from "@db/schema";
import { eq } from "drizzle-orm";

// Tiendanube API response types
interface TnCategory {
  name?: { es?: string } | string;
}

interface TnImage {
  src?: string;
}

interface TnVariant {
  stock?: number;
}

interface TnProduct {
  id: number;
  name?: { es?: string } | string;
  variants?: TnVariant[];
  price?: number;
  categories?: TnCategory[];
  images?: TnImage[];
}

function extractName(name: { es?: string } | string | undefined): string {
  if (!name) return "Sin nombre";
  if (typeof name === "string") return name;
  return name.es ?? "Sin nombre";
}

function extractCategoryName(categories: TnCategory[] | undefined): string {
  if (!categories || categories.length === 0) return "Sin categoria";
  const cat = categories[0];
  if (!cat.name) return "Sin categoria";
  if (typeof cat.name === "string") return cat.name;
  return cat.name.es ?? "Sin categoria";
}

export const tiendanubeRouter = createRouter({
  sync: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) {
      throw new Error("Faltan credenciales de Tiendanube. Configuralas en la pestana Config.");
    }

    const allTiendanubeIds: string[] = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;
    let totalImported = 0;

    // Paginate through ALL products from Tiendanube
    while (hasMore) {
      const resp = await fetch(
        `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authentication: `bearer ${s.tiendanubeApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) {
        throw new Error(`Tiendanube API error: ${resp.status}`);
      }

      const items = (await resp.json()) as TnProduct[];

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const p of items) {
        const name = extractName(p.name);
        const category = extractCategoryName(p.categories);
        const price = Number(p.price) || 0;
        const stock = p.variants?.[0]?.stock ?? 0;
        const imageUrl = p.images?.[0]?.src ?? null;
        const tid = String(p.id);

        allTiendanubeIds.push(tid);

        const existing = await getDb()
          .select()
          .from(products)
          .where(eq(products.tiendanubeId, tid))
          .limit(1);

        const priceCash30 = price * 0.7;
        const priceTransfer25 = price * 0.75;

        const data = {
          name,
          category,
          priceList: price.toFixed(2),
          priceCash30: priceCash30.toFixed(2),
          priceTransfer25: priceTransfer25.toFixed(2),
          stock,
          imageUrl,
          tiendanubeId: tid,
          active: true,
        };

        if (existing[0]) {
          await getDb().update(products).set(data).where(eq(products.id, existing[0].id));
        } else {
          await getDb().insert(products).values(data);
        }
        totalImported++;
      }

      if (items.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Delete products not in Tiendanube anymore
    let deletedCount = 0;
    if (allTiendanubeIds.length > 0) {
      const dbProducts = await getDb()
        .select({ tiendanubeId: products.tiendanubeId, id: products.id })
        .from(products)
        .where(eq(products.active, true));

      for (const dbProd of dbProducts) {
        if (dbProd.tiendanubeId && !allTiendanubeIds.includes(dbProd.tiendanubeId)) {
          await getDb().delete(products).where(eq(products.id, dbProd.id));
          deletedCount++;
        }
      }
    }

    return {
      imported: totalImported,
      deleted: deletedCount,
    };
  }),

  test: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) return { ok: false };
    try {
      const resp = await fetch(
        `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?limit=1`,
        {
          headers: { Authentication: `bearer ${s.tiendanubeApiToken}` },
        }
      );
      return { ok: resp.ok };
    } catch {
      return { ok: false };
    }
  }),
});
