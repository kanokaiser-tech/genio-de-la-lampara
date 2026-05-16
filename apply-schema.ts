import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Check if users table exists
  const [tables] = await conn.query("SHOW TABLES LIKE 'users'");
  const hasUsers = (tables as any[]).length > 0;
  
  if (hasUsers) {
    // Check if unionId column exists
    const [cols] = await conn.query("SHOW COLUMNS FROM users WHERE Field = 'unionId'");
    const hasUnionId = (cols as any[]).length > 0;
    
    if (hasUnionId) {
      // Table already has unionId - just add missing columns
      const alterStatements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS parentId bigint unsigned",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS discountType enum('efectivo','transferencia') DEFAULT 'efectivo'",
        "ALTER TABLE users MODIFY COLUMN role enum('superadmin','admin','revendedor','user') NOT NULL DEFAULT 'user'",
      ];
      
      for (const stmt of alterStatements) {
        try {
          await conn.query(stmt);
          console.log("OK:", stmt.substring(0, 60));
        } catch (e: any) {
          if (e.message.includes("Duplicate")) {
            console.log("SKIP (exists):", stmt.substring(0, 40));
          } else {
            console.log("ERROR:", e.message);
          }
        }
      }
    } else {
      // Old table without unionId - drop and recreate
      await conn.query("DROP TABLE IF EXISTS users");
      console.log("Dropped old users table");
      
      await conn.query(`
        CREATE TABLE users (
          id serial PRIMARY KEY,
          unionId varchar(255) NOT NULL UNIQUE,
          name varchar(255),
          email varchar(320),
          avatar text,
          phone varchar(50),
          role enum('superadmin','admin','revendedor','user') NOT NULL DEFAULT 'user',
          parentId bigint unsigned,
          discountType enum('efectivo','transferencia') DEFAULT 'efectivo',
          lastSignInAt timestamp DEFAULT CURRENT_TIMESTAMP,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("Created new users table");
    }
  } else {
    // Create users table from scratch
    await conn.query(`
      CREATE TABLE users (
        id serial PRIMARY KEY,
        unionId varchar(255) NOT NULL UNIQUE,
        name varchar(255),
        email varchar(320),
        avatar text,
        phone varchar(50),
        role enum('superadmin','admin','revendedor','user') NOT NULL DEFAULT 'user',
        parentId bigint unsigned,
        discountType enum('efectivo','transferencia') DEFAULT 'efectivo',
        lastSignInAt timestamp DEFAULT CURRENT_TIMESTAMP,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created users table");
  }
  
  await conn.end();
  console.log("DONE");
}
main().catch(e => console.error(e.message));
