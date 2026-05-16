import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query("SHOW TABLES");
  console.log("TABLES:");
  (rows as any[]).forEach(r => {
    const vals = Object.values(r);
    console.log("  " + vals[0]);
  });
  await conn.end();
}
main().catch(e => console.error(e.message));
