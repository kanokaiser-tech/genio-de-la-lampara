import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Create users table if not exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role ENUM('admin','revendedor') NOT NULL DEFAULT 'revendedor',
      parentId BIGINT UNSIGNED,
      discountType ENUM('efectivo','transferencia') DEFAULT 'efectivo',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create default admin
  const hash = await bcrypt.hash("admin123", 10);
  await conn.query(`
    INSERT IGNORE INTO users (id, name, email, password, role, phone, parentId, discountType)
    VALUES (1, 'Admin Principal', 'admin@genio.com', ?, 'admin', '5491123456789', NULL, 'efectivo')
  `, [hash]);

  // Create sample revendedor
  const hash2 = await bcrypt.hash("rev123", 10);
  await conn.query(`
    INSERT IGNORE INTO users (id, name, email, password, role, phone, parentId, discountType)
    VALUES (2, 'Carlos Lopez', 'carlos@genio.com', ?, 'revendedor', '5491187654321', 1, 'efectivo')
  `, [hash2]);

  // Create products table if not exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      category VARCHAR(255) NOT NULL,
      priceList DECIMAL(12,2) NOT NULL,
      priceCash30 DECIMAL(12,2) NOT NULL,
      priceTransfer25 DECIMAL(12,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      imageUrl TEXT,
      tiendanubeId VARCHAR(100),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create sample products
  const sampleProducts = [
    { name: "Lampara LED 12W", category: "Iluminacion", priceList: 15000, stock: 20 },
    { name: "Lampara LED 20W", category: "Iluminacion", priceList: 22000, stock: 15 },
    { name: "Lampara Colgante Vintage", category: "Decoracion", priceList: 35000, stock: 8 },
    { name: "Aplique Pared Exterior", category: "Exterior", priceList: 18000, stock: 12 },
    { name: "Portalamparas E27", category: "Accesorios", priceList: 3500, stock: 50 },
    { name: "Cable Electrico 2x1.5", category: "Accesorios", priceList: 2800, stock: 30 },
  ];

  for (const p of sampleProducts) {
    await conn.query(`
      INSERT IGNORE INTO products (name, category, priceList, priceCash30, priceTransfer25, stock, active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `, [p.name, p.category, p.priceList.toFixed(2), (p.priceList * 0.7).toFixed(2), (p.priceList * 0.75).toFixed(2), p.stock]);
  }

  // Create settings table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      storeName VARCHAR(255) NOT NULL DEFAULT 'Genio de la Lampara',
      whatsappNumber VARCHAR(50),
      tiendanubeApiToken TEXT,
      tiendanubeStoreId VARCHAR(100),
      webhookUrl TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`INSERT IGNORE INTO settings (id, storeName) VALUES (1, 'Genio de la Lampara')`);

  // Create orders and cart tables
  await conn.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      adminId BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      paymentType ENUM('efectivo','transferencia') NOT NULL,
      notes TEXT,
      totalAmount DECIMAL(12,2) NOT NULL,
      webhookSent BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS orderItems (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      orderId BIGINT UNSIGNED NOT NULL,
      productId BIGINT UNSIGNED NOT NULL,
      productName VARCHAR(500) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cartItems (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      productId BIGINT UNSIGNED NOT NULL,
      quantity INT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.end();
  console.log("Seed complete!");
}

main().catch(console.error);
