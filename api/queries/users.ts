// Legacy file - kept for compatibility with kimi/auth.ts
// All new code should use localUsers.ts instead
import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.unionId, unionId))
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

export async function upsertUser(data: {
  unionId: string;
  name?: string;
  email?: string;
  avatar?: string;
  lastSignInAt?: Date;
}) {
  const existing = await findUserByUnionId(data.unionId);
  
  if (existing) {
    // Update
    await getDb()
      .update(schema.localUsers)
      .set({
        name: data.name ?? existing.name,
        lastSignInAt: data.lastSignInAt ?? new Date(),
        ...(data.avatar ? { avatar: data.avatar } : {}),
      })
      .where(eq(schema.localUsers.id, existing.id));
    return existing.id;
  } else {
    // Insert with placeholder values for required fields
    const result = await getDb().insert(schema.localUsers).values({
      unionId: data.unionId,
      name: data.name ?? "OAuth User",
      email: data.email ?? `${data.unionId}@oauth.local`,
      password: "oauth-not-used",
      avatar: data.avatar ?? null,
      lastSignInAt: data.lastSignInAt ?? new Date(),
      role: "revendedor",
      discountType: "efectivo",
      parentId: null,
      phone: null,
    }).$returningId();
    return result[0]?.id;
  }
}
