import { getDb } from "../api/queries/connection";
import { products, settings } from "./schema";

async function seed() {
  const db = getDb();

  // Insert sample products if none exist
  const existing = await db.select().from(products).limit(1);
  if (existing.length === 0) {
    console.log("Seeding sample products...");
    await db.insert(products).values([
      {
        name: "Auriculares Bluetooth TWS Inalambricos",
        category: "Audio",
        priceList: "12990",
        priceCash30: "9093",
        priceTransfer25: "9743",
        stock: 10,
        active: true,
      },
      {
        name: "Parlante Bluetooth Portatil",
        category: "Audio",
        priceList: "19990",
        priceCash30: "13993",
        priceTransfer25: "14993",
        stock: 5,
        active: true,
      },
      {
        name: "Cargador Rapido USB-C 20W",
        category: "Cargadores",
        priceList: "6990",
        priceCash30: "4893",
        priceTransfer25: "5243",
        stock: 15,
        active: true,
      },
      {
        name: "Cable USB Lightning 1m",
        category: "Cables",
        priceList: "2990",
        priceCash30: "2093",
        priceTransfer25: "2243",
        stock: 20,
        active: true,
      },
    ]);
    console.log("Sample products seeded!");
  }

  // Insert default settings if none exist
  const existingSettings = await db.select().from(settings).limit(1);
  if (existingSettings.length === 0) {
    console.log("Seeding default settings...");
    await db.insert(settings).values({
      storeName: "Genio de la Lampara",
      whatsappNumber: "",
      tiendanubeApiToken: "",
      tiendanubeStoreId: "",
      webhookUrl: "",
    });
    console.log("Default settings seeded!");
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
