import { getDb } from "../queries/connection";

async function columnExists(db: any, table: string, column: string): Promise<boolean> {
  try {
    const result = await db.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}' LIMIT 1` as any
    );
    return result.length > 0;
  } catch {
    return false;
  }
}

export async function runMigrations() {
  const db = getDb();
  console.log("[MIGRATIONS] Running database migrations...");

  try {
    // Check if orders table has goldCoinsUsed column
    if (await columnExists(db, "orders", "goldCoinsUsed")) {
      console.log("[MIGRATIONS] orders.goldCoinsUsed already exists");
    } else {
      console.log("[MIGRATIONS] Adding goldCoinsUsed to orders...");
      await db.execute(`ALTER TABLE orders ADD COLUMN goldCoinsUsed INT DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] goldCoinsUsed added to orders");
    }

    // Check if orders table has discountPesos column
    if (await columnExists(db, "orders", "discountPesos")) {
      console.log("[MIGRATIONS] orders.discountPesos already exists");
    } else {
      console.log("[MIGRATIONS] Adding discountPesos to orders...");
      await db.execute(`ALTER TABLE orders ADD COLUMN discountPesos DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] discountPesos added to orders");
    }

    // Check if dailyClosures table has totalReal column
    if (await columnExists(db, "dailyClosures", "totalReal")) {
      console.log("[MIGRATIONS] dailyClosures.totalReal already exists");
    } else {
      console.log("[MIGRATIONS] Adding totalReal to dailyClosures...");
      await db.execute(`ALTER TABLE dailyClosures ADD COLUMN totalReal DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] totalReal added to dailyClosures");
    }

    // Check if dailyClosures table has totalDiscountCoins column
    if (await columnExists(db, "dailyClosures", "totalDiscountCoins")) {
      console.log("[MIGRATIONS] dailyClosures.totalDiscountCoins already exists");
    } else {
      console.log("[MIGRATIONS] Adding totalDiscountCoins to dailyClosures...");
      await db.execute(`ALTER TABLE dailyClosures ADD COLUMN totalDiscountCoins DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] totalDiscountCoins added to dailyClosures");
    }

    console.log("[MIGRATIONS] All migrations completed successfully");
  } catch (err: any) {
    console.error("[MIGRATIONS] Error:", err.message);
  }
}
