import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertLocalUser } from "@db/schema";
import { getDb } from "./connection";

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.email, email))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.id, id))
    .limit(1);
  return rows.at(0);
}

export async function getAllUsers() {
  return getDb().select().from(schema.localUsers);
}

export async function getUsersByRole(role: "superadmin" | "admin" | "revendedor") {
  return getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.role, role));
}

export async function getRevendedoresByAdminId(adminId: number) {
  return getDb()
    .select()
    .from(schema.localUsers)
    .where(
      and(
        eq(schema.localUsers.role, "revendedor"),
        eq(schema.localUsers.parentId, adminId)
      )
    );
}

export async function getAdmins() {
  return getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.role, "admin"));
}

export async function createUser(data: InsertLocalUser) {
  const result = await getDb().insert(schema.localUsers).values(data).$returningId();
  return result[0]?.id;
}

export async function updateUser(id: number, data: Partial<InsertLocalUser>) {
  await getDb()
    .update(schema.localUsers)
    .set(data)
    .where(eq(schema.localUsers.id, id));
}

export async function deleteUser(id: number) {
  await getDb()
    .delete(schema.localUsers)
    .where(eq(schema.localUsers.id, id));
}

export async function countUsers() {
  const result = await getDb()
    .select({ count: schema.localUsers.id })
    .from(schema.localUsers)
    .limit(1);
  return result.length;
}
