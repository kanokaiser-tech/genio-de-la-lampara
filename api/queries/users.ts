import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function getAllUsers() {
  return getDb().select().from(schema.users);
}

export async function getUsersByRole(role: "superadmin" | "admin" | "revendedor" | "user") {
  return getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, role));
}

export async function getRevendedoresByAdminId(adminId: number) {
  return getDb()
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, "revendedor"),
        eq(schema.users.parentId, adminId)
      )
    );
}

export async function getAdmins() {
  return getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "admin"));
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  // First login (app creator) becomes superadmin
  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "superadmin";
    updateSet.role = "superadmin";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function createUser(data: InsertUser) {
  const result = await getDb().insert(schema.users).values(data).$returningId();
  return result[0]?.id;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  await getDb()
    .update(schema.users)
    .set(data)
    .where(eq(schema.users.id, id));
}

export async function deleteUser(id: number) {
  await getDb()
    .delete(schema.users)
    .where(eq(schema.users.id, id));
}
