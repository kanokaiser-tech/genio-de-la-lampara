const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Add slug column to products if not exists
  const [cols] = await conn.query("SHOW COLUMNS FROM products WHERE Field = 'slug'");
  if (cols.length === 0) {
    await conn.query("ALTER TABLE products ADD COLUMN slug VARCHAR(500)");
    await conn.query("ALTER TABLE products ADD UNIQUE INDEX slug_idx (slug)");
    console.log("Added slug column");
  }

  await conn.end();
  console.log("Migration done");
}
main().catch((e) => {
  console.error("Migration error:", e.message);
  process.exit(1);
});
