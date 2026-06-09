import { getDb } from "../queries/connection";

export async function runMigrations() {
  const db = getDb();
  console.log("[MIGRATIONS] Running database migrations...");

  try {
    // Check if orders table has goldCoinsUsed column
    try {
      await db.execute(`SELECT goldCoinsUsed FROM orders LIMIT 1` as any);
      console.log("[MIGRATIONS] orders.goldCoinsUsed already exists");
    } catch {
      console.log("[MIGRATIONS] Adding goldCoinsUsed to orders...");
      await db.execute(`ALTER TABLE orders ADD COLUMN goldCoinsUsed INT DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] goldCoinsUser added to orders");
    }

    // Check if orders table has discountPesos column
    try {
      await db.execute(`SELECT discountPesos FROM orders LIMIT 1` as any);
      console.log("[MIGRATIONS] orders.discountPesos already exists");
    } catch {
      console.log("[MIGRATIONS] Adding discountPesos to orders...");
      await db.execute(`ALTER TABLE orders ADD COLUMN discountPesos DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] discountPesos added to orders");
    }

    // Check if dailyClosures table has totalReal column
    try {
      await db.execute(`SELECT totalReal FROM dailyClosures LIMIT 1` as any);
      console.log("[MIGRATIONS] dailyClosures.totalReal already exists");
    } catch {
      console.log("[MIGRATIONS] Adding totalReal to dailyClosures...");
      await db.execute(`ALTER TABLE dailyClosures ADD COLUMN totalReal DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] totalReal added to dailyClosures");
    }

    // Check if dailyClosures table has totalDiscountCoins column
    try {
      await db.execute(`SELECT totalDiscountCoins FROM dailyClosures LIMIT 1` as any);
      console.log("[MIGRATIONS] dailyClosures.totalDiscountCoins already exists");
    } catch {
      console.log("[MIGRATIONS] Adding totalDiscountCoins to dailyClosures...");
      await db.execute(`ALTER TABLE dailyClosures ADD COLUMN totalDiscountCoins DECIMAL(12,2) DEFAULT 0 NOT NULL` as any);
      console.log("[MIGRATIONS] totalDiscountCoins added to dailyClosures");
    }

    console.log("[MIGRATIONS] All migrations completed successfully");
  } catch (err: any) {
    console.error("[MIGRATIONS] Error:", err.message);
  }
}
