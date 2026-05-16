import { eq, and } from "drizzle-orm";
import { getDb } from "./connection";
import { users } from "@db/schema";
import type { InsertUser } from "@db/schema";

export async function findUserByEmail(email: string) {
  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows.at(0);
}

// Legacy functions for Kimi auth compatibility
export async function findUserByUnionId(unionId: string) {
  const rows = await getDb().select().from(users).where(eq(users.email, unionId)).limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = { ...data };
  await getDb().insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getAllUsers() {
  return getDb().select().from(users);
}

export async function getUsersByRole(role: "admin" | "revendedor") {
  return getDb().select().from(users).where(eq(users.role, role));
}

export async function getRevendedoresByAdminId(adminId: number) {
  return getDb().select().from(users).where(and(eq(users.role, "revendedor"), eq(users.parentId, adminId)));
}

export async function getAdmins() {
  return getDb().select().from(users).where(eq(users.role, "admin"));
}

export async function createUser(data: InsertUser) {
  const result = await getDb().insert(users).values(data).$returningId();
  return result[0]?.id;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  await getDb().update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  await getDb().delete(users).where(eq(users.id, id));
}
