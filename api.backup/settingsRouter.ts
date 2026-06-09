import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings } from "@db/schema";

export const settingsRouter = createRouter({
  get: adminQuery.query(async () => {
    const rows = await getDb().select().from(settings).limit(1);
    return rows[0] ?? null;
  }),

  update: adminQuery
    .input(z.object({
      storeName: z.string().optional(),
      whatsappNumber: z.string().optional(),
      tiendanubeApiToken: z.string().optional(),
      tiendanubeStoreId: z.string().optional(),
      webhookUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(settings).limit(1);
      if (existing[0]) {
        await db.update(settings).set(input).where(eq(settings.id, existing[0].id));
      } else {
        await db.insert(settings).values(input);
      }
      return { success: true };
    }),
});
