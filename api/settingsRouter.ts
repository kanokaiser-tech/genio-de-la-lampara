import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getSettings, upsertSettings } from "./queries/settings";

export const settingsRouter = createRouter({
  // Get settings - any authenticated user can read
  get: adminQuery.query(async () => {
    return getSettings();
  }),

  // Update settings - admin only
  update: adminQuery
    .input(
      z.object({
        storeName: z.string().optional(),
        whatsappNumber: z.string().optional(),
        tiendanubeApiToken: z.string().optional(),
        tiendanubeStoreId: z.string().optional(),
        webhookUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const settings = await upsertSettings(input);
      return settings;
    }),
});
