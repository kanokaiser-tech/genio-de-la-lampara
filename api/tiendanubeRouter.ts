import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, products } from "@db/schema";
import { eq } from "drizzle-orm";

interface TnProduct {
  id: number;
  name: { es?: string } | string;
  price: number;
  categories?: Array<{ name: string }>;
  images?: Array<{ src: string }>;
  variants?: Array<{ stock: number }>;
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
        const price = p.price ?? 0;
        const name = typeof p.name === "string" ? p.name : (p.name?.es ?? "Sin nombre");
        const tid = String(p.id);
        allTiendanubeIds.push(tid);

        const existing = await getDb()
          .select()
          .from(products)
          .where(eq(products.tiendanubeId, tid))
          .limit(1);

        const data = {
          name,
          category: p.categories?.[0]?.name ?? "Sin categoria",
          priceList: price.toFixed(2),
          priceCash30: (price * 0.7).toFixed(2),
          priceTransfer25: (price * 0.75).toFixed(2),
          stock: p.variants?.[0]?.stock ?? 0,
          imageUrl: p.images?.[0]?.src ?? null,
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

      // If we got fewer items than limit, we've reached the end
      if (items.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    // Delete products that exist in our DB but NOT in Tiendanube
    // Only delete products that have a tiendanubeId (i.e., were imported from Tiendanube)
    if (allTiendanubeIds.length > 0) {
      const dbProducts = await getDb()
        .select({ tiendanubeId: products.tiendanubeId })
        .from(products)
        .where(eq(products.active, true));

      const dbTiendanubeIds = dbProducts
        .map((p) => p.tiendanubeId)
        .filter((id): id is string => id !== null);

      const idsToDelete = dbTiendanubeIds.filter(
        (dbId) => !allTiendanubeIds.includes(dbId)
      );

      if (idsToDelete.length > 0) {
        for (const tid of idsToDelete) {
          await getDb().delete(products).where(eq(products.tiendanubeId, tid));
        }
      }
    }

    return {
      imported: totalImported,
      deleted: allTiendanubeIds.length > 0
        ? (await getDb().select().from(products).where(eq(products.active, true))).length - totalImported
        : 0,
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
