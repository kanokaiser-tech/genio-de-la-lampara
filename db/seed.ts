import { getDb } from "../api/queries/connection";
import { users } from "./schema";
import { hashPassword } from "../api/localAuth";

async function seed() {
  const db = getDb();

  // Verificar si ya existe el superadmin
  const existing = await db.select().from(users).where(eq(users.email, "superadmin@genio.com"));
  if (existing.length === 0) {
    const hashed = await hashPassword("superadmin123");
    await db.insert(users).values({
      name: "Super Admin",
      email: "superadmin@genio.com",
      password: hashed,
      phone: "",
      role: "superadmin",
      parentId: null,
      discountType: "efectivo",
    });
    console.log("SuperAdmin creado: superadmin@genio.com / superadmin123");
  } else {
    console.log("SuperAdmin ya existe");
  }

  // Verificar si ya existe el admin legacy
  const legacy = await db.select().from(users).where(eq(users.email, "admin@genio.com"));
  if (legacy.length === 0) {
    const hashed = await hashPassword("admin123");
    await db.insert(users).values({
      name: "Administrador",
      email: "admin@genio.com",
      password: hashed,
      phone: "",
      role: "admin",
      parentId: null,
      discountType: "efectivo",
    });
    console.log("Admin creado: admin@genio.com / admin123");
  } else {
    console.log("Admin ya existe");
  }

  process.exit(0);
}

import { eq } from "drizzle-orm";
seed().catch(console.error);
