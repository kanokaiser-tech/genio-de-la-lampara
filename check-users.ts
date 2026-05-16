import { getDb } from "./api/queries/connection";
import { localUsers } from "./db/schema";
import bcrypt from "bcryptjs";

async function main() {
  const db = getDb();
  const users = await db.select().from(localUsers);
  console.log("USERS_COUNT:" + users.length);
  
  if (users.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    const result = await db.insert(localUsers).values({
      name: "Admin Principal",
      email: "admin@genio.com",
      password: hash,
      role: "superadmin",
      phone: "5491123456789",
    }).$returningId();
    console.log("SUPERADMIN_CREATED:" + result[0]?.id);
    
    const hash2 = await bcrypt.hash("admin123", 10);
    const result2 = await db.insert(localUsers).values({
      name: "Juan Perez",
      email: "juan@genio.com",
      password: hash2,
      role: "admin",
      phone: "5491165498765",
      parentId: 1,
    }).$returningId();
    console.log("ADMIN_CREATED:" + result2[0]?.id);
    
    const hash3 = await bcrypt.hash("rev123", 10);
    const result3 = await db.insert(localUsers).values({
      name: "Carlos Lopez",
      email: "carlos@genio.com",
      password: hash3,
      role: "revendedor",
      phone: "5491187654321",
      parentId: 2,
      discountType: "efectivo",
    }).$returningId();
    console.log("REVENDEDOR_CREATED:" + result3[0]?.id);
  } else {
    console.log("USERS_EXIST");
    users.forEach(u => console.log("USER:" + u.id + "|" + u.name + "|" + u.email + "|" + u.role));
  }
}
main().catch(e => console.error("ERROR:" + e.message));
