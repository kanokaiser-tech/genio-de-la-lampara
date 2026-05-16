const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  await conn.query("UPDATE users SET role = 'admin' WHERE role = 'superadmin'");
  console.log("Updated roles");
  
  const hash1 = await bcrypt.hash('admin123', 10);
  await conn.query(
    "INSERT IGNORE INTO users (name, email, password, role, phone, discountType) VALUES (?, ?, ?, 'admin', '5491123456789', 'efectivo')",
    ['Admin Principal', 'admin@genio.com', hash1]
  );
  
  const hash2 = await bcrypt.hash('rev123', 10);
  await conn.query(
    "INSERT IGNORE INTO users (name, email, password, role, phone, parentId, discountType) VALUES (?, ?, ?, 'revendedor', '5491187654321', 1, 'efectivo')",
    ['Carlos Lopez', 'carlos@genio.com', hash2]
  );
  console.log("Users seeded");
  
  const [pc] = await conn.query('SELECT COUNT(*) as c FROM products');
  if (pc[0].c < 6) {
    const prods = [
      ['Lampara LED 12W', 'Iluminacion', 15000, 20],
      ['Lampara LED 20W', 'Iluminacion', 22000, 15],
      ['Lampara Colgante Vintage', 'Decoracion', 35000, 8],
      ['Aplique Pared Exterior', 'Exterior', 18000, 12],
      ['Portalamparas E27', 'Accesorios', 3500, 50],
      ['Cable Electrico 2x1.5', 'Accesorios', 2800, 30],
    ];
    for (const p of prods) {
      await conn.query(
        'INSERT IGNORE INTO products (name, category, priceList, priceCash30, priceTransfer25, stock, active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [p[0], p[1], p[2].toFixed(2), (p[2]*0.7).toFixed(2), (p[2]*0.75).toFixed(2), p[3]]
      );
    }
    console.log('Products seeded');
  }
  
  await conn.end();
  console.log('Seed done!');
}
main().catch(e => console.error(e));
