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
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) throw new Error("Faltan credenciales de Tiendanube");

    const resp = await fetch(`https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products`, {
      headers: { Authentication: `bearer ${s.tiendanubeApiToken}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) throw new Error(`Tiendanube API error: ${resp.status}`);

    const items = (await resp.json()) as TnProduct[];
    let count = 0;

    for (const p of items) {
      const price = p.price ?? 0;
      const name = typeof p.name === "string" ? p.name : (p.name?.es ?? "Sin nombre");
      const tid = String(p.id);

      const existing = await getDb().select().from(products).where(eq(products.tiendanubeId, tid)).limit(1);

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
      count++;
    }
    return { imported: count };
  }),

  test: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) return { ok: false };
    try {
      const resp = await fetch(`https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?limit=1`, {
        headers: { Authentication: `bearer ${s.tiendanubeApiToken}` },
      });
      return { ok: resp.ok };
    } catch { return { ok: false }; }
  }),
});
