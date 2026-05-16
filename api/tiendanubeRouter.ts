import { createRouter, adminQuery } from "./middleware";
import { getSettings } from "./queries/settings";
import { upsertProductByTiendanubeId } from "./queries/products";

interface TiendanubeProduct {
  id: number;
  name: { es?: string } | string;
  price: number;
  categories?: Array<{ name: string }>;
  images?: Array<{ src: string }>;
  variants?: Array<{ stock: number }>;
}

export const tiendanubeRouter = createRouter({
  // Sync products from Tiendanube
  sync: adminQuery.mutation(async () => {
    const settings = await getSettings();
    if (!settings?.tiendanubeApiToken || !settings?.tiendanubeStoreId) {
      throw new Error("Tiendanube credentials not configured");
    }

    const { tiendanubeApiToken, tiendanubeStoreId } = settings;

    try {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${tiendanubeStoreId}/products`,
        {
          headers: {
            Authentication: `bearer ${tiendanubeApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Tiendanube API error: ${response.status}`);
      }

      const products = (await response.json()) as TiendanubeProduct[];
      const importedIds: string[] = [];

      for (const product of products) {
        const priceList = product.price ?? 0;
        const priceCash30 = priceList * 0.7;
        const priceTransfer25 = priceList * 0.75;
        const category = product.categories?.[0]?.name ?? "Sin categoria";
        const imageUrl = product.images?.[0]?.src ?? "";
        const stock = product.variants?.[0]?.stock ?? 0;
        const productName =
          typeof product.name === "string"
            ? product.name
            : product.name?.es ?? "Sin nombre";

        await upsertProductByTiendanubeId(String(product.id), {
          name: productName,
          category,
          priceList: priceList.toFixed(2),
          priceCash30: priceCash30.toFixed(2),
          priceTransfer25: priceTransfer25.toFixed(2),
          stock,
          imageUrl,
          tiendanubeId: String(product.id),
          active: true,
        });

        importedIds.push(String(product.id));
      }

      return {
        success: true,
        imported: importedIds.length,
        ids: importedIds,
      };
    } catch (error) {
      throw new Error(
        `Failed to sync with Tiendanube: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  // Test connection to Tiendanube
  test: adminQuery.mutation(async () => {
    const settings = await getSettings();
    if (!settings?.tiendanubeApiToken || !settings?.tiendanubeStoreId) {
      throw new Error("Tiendanube credentials not configured");
    }

    try {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${settings.tiendanubeStoreId}/products?limit=1`,
        {
          headers: {
            Authentication: `bearer ${settings.tiendanubeApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: response.ok,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
});
