const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check columns in users table
  const [cols] = await conn.query("SHOW COLUMNS FROM users");
  const colNames = cols.map(c => c.Field);
  console.log('Current columns:', colNames.join(', '));
  
  // Add missing columns
  if (!colNames.includes('password')) {
    await conn.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT 'temp'");
    console.log('Added password column');
  }
  if (!colNames.includes('parentId')) {
    await conn.query("ALTER TABLE users ADD COLUMN parentId BIGINT UNSIGNED");
    console.log('Added parentId column');
  }
  if (!colNames.includes('discountType')) {
    await conn.query("ALTER TABLE users ADD COLUMN discountType ENUM('efectivo','transferencia') DEFAULT 'efectivo'");
    console.log('Added discountType column');
  }
  if (!colNames.includes('phone')) {
    await conn.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50)");
    console.log('Added phone column');
  }
  
  // Update role enum if needed
  await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','revendedor') NOT NULL DEFAULT 'revendedor'");
  console.log('Updated role enum');
  
  // Remove default from password
  await conn.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL");
  
  // Remove unionId if exists
  if (colNames.includes('unionId')) {
    await conn.query("ALTER TABLE users DROP COLUMN unionId");
    console.log('Dropped unionId');
  }
  if (colNames.includes('avatar')) {
    await conn.query("ALTER TABLE users DROP COLUMN avatar");
    console.log('Dropped avatar');
  }
  if (colNames.includes('lastSignInAt')) {
    await conn.query("ALTER TABLE users DROP COLUMN lastSignInAt");
    console.log('Dropped lastSignInAt');
  }
  
  await conn.end();
  console.log('Migration done!');
}
main().catch(e => console.error(e.message));
