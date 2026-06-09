import { getDb, getDbRawPool } from "./queries/connection";

let lastSync = 0;
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
let jobRunning = false;

/**
 * Sincroniza productos de Tiendanube con la base de datos local.
 * - Usa paginacion (per_page=200) para traer todos los productos
 * - Hace upsert por slug (INSERT ... ON DUPLICATE KEY UPDATE)
 * - Elimina productos locales que ya no existen en Tiendanube
 */
export async function runTiendanubeSync() {
  // Evitar corridas simultaneas
  if (jobRunning) {
    console.log("[SyncJob] Otra sincronizacion esta en curso, saltando...");
    return { skipped: true };
  }

  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) {
    console.log(`[SyncJob] Demasiado pronto (${Math.round((now - lastSync) / 1000)}s < ${SYNC_INTERVAL_MS / 1000}s), saltando...`);
    return { skipped: true, nextIn: Math.round((SYNC_INTERVAL_MS - (now - lastSync)) / 1000) };
  }

  jobRunning = true;
  console.log("[SyncJob] Iniciando sincronizacion con Tiendanube...");
  const startTime = Date.now();

  try {
    const db = getDb();

    // Obtener configuracion usando mysql2 directamente
    let s: any;
    try {
      const pool = getDbRawPool();
      const [rows] = await pool.query('SELECT tiendanubeApiToken, tiendanubeStoreId FROM settings LIMIT 1');
      s = (rows as any[])[0];
    } catch (e: any) {
      console.error("[SyncJob] Error leyendo settings:", e.message);
      jobRunning = false;
      return { error: "DB error: " + e.message };
    }
    if (!s?.tiendanubeApiToken || !s?.tiendanubeStoreId) {
      console.log("[SyncJob] Sin configuracion de Tiendanube, abortando.");
      jobRunning = false;
      return { error: "Sin configuracion" };
    }

    const token = s.tiendanubeApiToken;
    const storeId = s.tiendanubeStoreId;
    const allProducts: any[] = [];
    let page = 1;
    const perPage = 200;

    // Traer todos los productos paginados
    while (true) {
      const res = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/products?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authentication: `bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "GenioSync/1.0",
          },
        }
      );

      if (!res.ok) {
        console.error(`[SyncJob] Error pagina ${page}: ${res.status}`);
        break;
      }

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;

      allProducts.push(...batch);
      if (batch.length < perPage) break;
      page++;

      // Safety: max 20 paginas
      if (page > 20) {
        console.warn("[SyncJob] Limite de paginas alcanzado (20)");
        break;
      }
    }

    if (allProducts.length === 0) {
      jobRunning = false;
      return { imported: 0, deleted: 0 };
    }

    // Construir batch de upsert por slug
    const placeholders = allProducts
      .map(
        () =>
          `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .join(", ");

    const columns = [
      "name", "category", "priceList", "priceCash30", "priceTransfer25",
      "slug", "tiendanubeId", "tiendanubeVariantId", "imageUrl", "stock"
    ];

    const updateSet = columns.map((c) => `${c} = VALUES(${c})`).join(", ");

    const values: any[] = [];
    for (const p of allProducts) {
      const priceList = Number(p.variants?.[0]?.price ?? p.price ?? 0);
      const discount30 = priceList * 0.3;
      const discount25 = priceList * 0.25;
      values.push(
        String(p.name ?? "").substring(0, 255),
        String(p.categories?.[0]?.name ?? "Sin categoria").substring(0, 100),
        priceList.toFixed(2),
        (priceList - discount30).toFixed(2),
        (priceList - discount25).toFixed(2),
        String(p.slug ?? p.name ?? "").substring(0, 255),
        String(p.id ?? "").substring(0, 100),
        String(p.variants?.[0]?.id ?? "").substring(0, 100),
        String(p.images?.[0]?.src ?? p.image?.src ?? "").substring(0, 500),
        Number(p.variants?.[0]?.stock ?? 0)
      );
    }

    const sqlQuery = `
      INSERT INTO products (${columns.join(", ")})
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE ${updateSet}
    `;

    const pool = getDbRawPool();
    await pool.query(sqlQuery, values);

    // Eliminar productos que ya no estan en Tiendanube
    const tnIds = allProducts.map((p) => String(p.id));
    const [localRows] = await pool.query('SELECT id, tiendanubeId FROM products');

    const toDelete = (localRows as any[]).filter((r) => r.tiendanubeId && !tnIds.includes(String(r.tiendanubeId)));
    if (toDelete.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const ids = batch.map((r) => r.id).join(",");
        await pool.query(`DELETE FROM products WHERE id IN (${ids})`);
      }
    }

    const duration = Date.now() - startTime;
    lastSync = Date.now();
    console.log(`[SyncJob] OK: ${allProducts.length} productos en ${duration}ms`);
    jobRunning = false;

    return {
      imported: allProducts.length,
      deleted: toDelete.length,
      durationMs: duration,
    };
  } catch (err: any) {
    jobRunning = false;
    console.error("[SyncJob] ERROR:", err.message);
    return { error: err.message };
  }
}

/**
 * Inicia el job recurrente cada N minutos.
 * En serverless puede no funcionar, pero en VPS/dedicado si.
 */
export function startSyncJob() {
  // Correr inmediatamente al iniciar el servidor
  runTiendanubeSync().catch(() => {});

  // Y cada 10 minutos
  setInterval(() => {
    runTiendanubeSync().catch(() => {});
  }, SYNC_INTERVAL_MS);

  console.log("[SyncJob] Job iniciado: sync cada 10 minutos + post-venta");
}

/**
 * Fuerza un sync inmediato (usado despues de cada venta aprobada)
 */
export async function forceSyncAfterSale() {
  // Resetear el timer para que corra ahora
  lastSync = 0;
  return runTiendanubeSync();
}
