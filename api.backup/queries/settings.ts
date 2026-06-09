import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertSetting } from "@db/schema";
import { getDb } from "./connection";

export async function getSettings() {
  const rows = await getDb()
    .select()
    .from(schema.settings)
    .limit(1);
  return rows.at(0) ?? null;
}

export async function upsertSettings(data: Partial<InsertSetting>) {
  const existing = await getSettings();
  if (existing) {
    await getDb()
      .update(schema.settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.settings.id, existing.id));
  } else {
    await getDb().insert(schema.settings).values({
      storeName: data.storeName ?? "Genio de la Lampara",
      whatsappNumber: data.whatsappNumber ?? null,
      tiendanubeApiToken: data.tiendanubeApiToken ?? null,
      tiendanubeStoreId: data.tiendanubeStoreId ?? null,
      webhookUrl: data.webhookUrl ?? null,
    } as InsertSetting);
  }
  return getSettings();
}
