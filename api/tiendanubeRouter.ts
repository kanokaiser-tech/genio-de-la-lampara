import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, products } from "@db/schema";
import { eq } from "drizzle-orm";

interface TnCategory {
  name?: { es?: string; en?: string; pt?: string } | string;
}

interface TnImage {
  src?: string;
}

interface TnVariant {
  stock?: number;
}

interface TnProduct {
  id: number;
  name?: { es?: string; en?: string; pt?: string } | string;
  variants?: TnVariant[];
  price?: number;
  categories?: TnCategory[];
  images?: TnImage[];
}

function extractName(name: { es?: string; en?: string; pt?: string } | string | undefined): string {
  if (!name) return "Sin nombre";
  if (typeof name === "string") return name;
  return name.es ?? name.en ?? name.pt ?? "Sin nombre";
}

function extractCategoryName(categories: TnCategory[] | undefined): string {
  if (!categories || categories.length === 0) return "Sin categoria";
  const cat = categories[0];
  if (!cat.name) return "Sin categoria";
  if (typeof cat.name === "string") return cat.name;
  return cat.name.es ?? cat.name.en ?? cat.name.pt ?? "Sin categoria";
}

export const tiendanubeRouter = createRouter({
  sync: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) {
      throw new Error("Faltan credenciales de Tiendanube. Configuralas en la pestana Config.");
    }

    // Fetch page 1 to get total count
    const page1Resp = await fetchWithTimeout(
      `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?per_page=200&page=1`,
      {
        headers: {
          Authentication: `bearer ${s.tiendanubeApiToken}`,
          "User-Agent": "GenioResellerApp/1.0",
        },
      },
      15000
    );

    if (!page1Resp.ok) {
      const errBody = await page1Resp.text().catch(() => "");
      throw new Error(`Tiendanube API error ${page1Resp.status}: ${errBody.substring(0, 200)}`);
    }

    const page1Items = (await page1Resp.json()) as TnProduct[];
    const totalCount = extractTotalCount(page1Resp, page1Items.length);
    const allItems: TnProduct[] = [...page1Items];

    // Fetch remaining pages in parallel
    const totalPages = Math.ceil(totalCount / 200);
    if (totalPages > 1) {
      const pagePromises: Promise<TnProduct[]>[] = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(
          fetchPage(s.tiendanubeStoreId!, s.tiendanubeApiToken!, p)
        );
      }
      const results = await Promise.allSettled(pagePromises);
      for (const r of results) {
        if (r.status === "fulfilled") allItems.push(...r.value);
      }
    }

    if (allItems.length === 0) {
      return { imported: 0, deleted: 0 };
    }

    // Build maps for efficient upsert
    const allTiendanubeIds: string[] = [];
    const upserts: {
      name: string; category: string; priceList: string; priceCash30: string;
      priceTransfer25: string; stock: number; imageUrl: string | null;
      tiendanubeId: string; active: boolean;
    }[] = [];

    for (const p of allItems) {
      const name = extractName(p.name);
      const category = extractCategoryName(p.categories);
      const price = Number(p.price) || 0;
      const stock = p.variants?.[0]?.stock ?? 0;
      const imageUrl = p.images?.[0]?.src ?? null;
      const tid = String(p.id);

      allTiendanubeIds.push(tid);
      upserts.push({
        name,
        category,
        priceList: price.toFixed(2),
        priceCash30: (price * 0.7).toFixed(2),
        priceTransfer25: (price * 0.75).toFixed(2),
        stock,
        imageUrl,
        tiendanubeId: tid,
        active: true,
      });
    }

    // Batch upsert using INSERT ... ON DUPLICATE KEY UPDATE
    const db = getDb();
    const batchSize = 50;
    for (let i = 0; i < upserts.length; i += batchSize) {
      const batch = upserts.slice(i, i + batchSize);
      for (const item of batch) {
        const existing = await db.select().from(products).where(eq(products.tiendanubeId, item.tiendanubeId)).limit(1);
        if (existing[0]) {
          await db.update(products).set(item).where(eq(products.id, existing[0].id));
        } else {
          await db.insert(products).values(item);
        }
      }
    }

    // Delete products not in Tiendanube
    let deletedCount = 0;
    const dbProds = await db.select({ tiendanubeId: products.tiendanubeId, id: products.id }).from(products).where(eq(products.active, true));
    const tnIdsSet = new Set(allTiendanubeIds);
    for (const dp of dbProds) {
      if (dp.tiendanubeId && !tnIdsSet.has(dp.tiendanubeId)) {
        await db.delete(products).where(eq(products.id, dp.id));
        deletedCount++;
      }
    }

    return { imported: upserts.length, deleted: deletedCount };
  }),

  test: adminQuery.mutation(async () => {
    const [s] = await getDb().select().from(settings).limit(1);
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) return { ok: false };
    try {
      const resp = await fetchWithTimeout(
        `https://api.tiendanube.com/v1/${s.tiendanubeStoreId}/products?per_page=1`,
        { headers: { Authentication: `bearer ${s.tiendanubeApiToken}`, "User-Agent": "GenioResellerApp/1.0" } },
        10000
      );
      return { ok: resp.ok };
    } catch {
      return { ok: false };
    }
  }),
});

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function fetchPage(storeId: string, token: string, page: number): Promise<TnProduct[]> {
  try {
    const resp = await fetchWithTimeout(
      `https://api.tiendanube.com/v1/${storeId}/products?per_page=200&page=${page}`,
      {
        headers: {
          Authentication: `bearer ${token}`,
          "User-Agent": "GenioResellerApp/1.0",
        },
      },
      15000
    );
    if (!resp.ok) return [];
    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return [];
    return (await resp.json()) as TnProduct[];
  } catch {
    return [];
  }
}

function extractTotalCount(resp: Response, fallback: number): number {
  // Tiendanube returns total count in X-Total-Count header
  const totalHeader = resp.headers.get("X-Total-Count");
  if (totalHeader) return parseInt(totalHeader, 10);
  return fallback;
}
