import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Read migration files
  const files = fs.readdirSync("./db/migrations").filter(f => f.endsWith(".sql")).sort();
  console.log("Migration files:", files);
  
  for (const file of files) {
    const sql = fs.readFileSync(`./db/migrations/${file}`, "utf8");
    const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log("OK:", stmt.substring(0, 60).replace(/\n/g, " "));
      } catch (e: any) {
        if (e.message.includes("Duplicate") || e.message.includes("already exists") || e.message.includes("1050")) {
          console.log("SKIP (exists):", stmt.substring(0, 40).replace(/\n/g, " "));
        } else {
          console.log("ERROR:", e.message, "| SQL:", stmt.substring(0, 80));
        }
      }
    }
  }
  
  // Add localUsers if not exists
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`localUsers\` (
        \`id\` serial AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(320) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`unionId\` varchar(255),
        \`avatar\` text,
        \`phone\` varchar(50),
        \`role\` enum('superadmin','admin','revendedor') NOT NULL DEFAULT 'revendedor',
        \`parentId\` bigint unsigned,
        \`discountType\` enum('efectivo','transferencia') DEFAULT 'efectivo',
        \`lastSignInAt\` timestamp DEFAULT (now()),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`localUsers_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`localUsers_email_unique\` UNIQUE(\`email\`)
      )
    `);
    console.log("localUsers table created/ok");
  } catch (e: any) {
    console.log("localUsers error:", e.message);
  }
  
  // Insert test users
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.default.hash("admin123", 10);
  
  try {
    await conn.query(`INSERT IGNORE INTO \`localUsers\` (\`id\`, \`name\`, \`email\`, \`password\`, \`role\`, \`phone\`, \`unionId\`, \`avatar\`, \`parentId\`, \`discountType\`) 
      VALUES (1, 'Admin Principal', 'admin@genio.com', ?, 'superadmin', '5491123456789', NULL, NULL, NULL, 'efectivo')`, [hash]);
    console.log("Superadmin inserted");
  } catch (e: any) {
    console.log("Insert superadmin:", e.message);
  }
  
  try {
    const hash2 = await bcrypt.default.hash("admin123", 10);
    await conn.query(`INSERT IGNORE INTO \`localUsers\` (\`id\`, \`name\`, \`email\`, \`password\`, \`role\`, \`phone\`, \`unionId\`, \`avatar\`, \`parentId\`, \`discountType\`) 
      VALUES (2, 'Juan Perez', 'juan@genio.com', ?, 'admin', '5491165498765', NULL, NULL, NULL, 'efectivo')`, [hash2]);
    console.log("Admin inserted");
  } catch (e: any) {
    console.log("Insert admin:", e.message);
  }
  
  try {
    const hash3 = await bcrypt.default.hash("rev123", 10);
    await conn.query(`INSERT IGNORE INTO \`localUsers\` (\`id\`, \`name\`, \`email\`, \`password\`, \`role\`, \`phone\`, \`unionId\`, \`avatar\`, \`parentId\`, \`discountType\`) 
      VALUES (3, 'Carlos Lopez', 'carlos@genio.com', ?, 'revendedor', '5491187654321', NULL, NULL, 2, 'efectivo')`, [hash3]);
    console.log("Revendedor inserted");
  } catch (e: any) {
    console.log("Insert revendedor:", e.message);
  }
  
  await conn.end();
  console.log("DONE");
}
main().catch(e => console.error(e.message));
