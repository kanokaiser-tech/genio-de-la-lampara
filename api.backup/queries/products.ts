import { eq, like, or, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertProduct } from "@db/schema";
import { getDb } from "./connection";

export async function getAllProducts() {
  return getDb()
    .select()
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(schema.products.category, schema.products.name);
}

export async function getProductById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);
  return rows.at(0);
}

export async function getProductsByCategory(category: string) {
  return getDb()
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.category, category),
        eq(schema.products.active, true)
      )
    );
}

export async function searchProducts(query: string) {
  return getDb()
    .select()
    .from(schema.products)
    .where(
      and(
        or(
          like(schema.products.name, `%${query}%`),
          like(schema.products.category, `%${query}%`)
        ),
        eq(schema.products.active, true)
      )
    );
}

export async function createProduct(data: InsertProduct) {
  const result = await getDb().insert(schema.products).values(data).$returningId();
  return result[0]?.id;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  await getDb()
    .update(schema.products)
    .set(data)
    .where(eq(schema.products.id, id));
}

export async function deleteProduct(id: number) {
  await getDb()
    .delete(schema.products)
    .where(eq(schema.products.id, id));
}

export async function clearAllProducts() {
  await getDb().delete(schema.products);
}

export async function getCategories() {
  const result = await getDb()
    .selectDistinct({ category: schema.products.category })
    .from(schema.products)
    .where(eq(schema.products.active, true));
  return result.map((r) => r.category);
}

export async function upsertProductByTiendanubeId(
  tiendanubeId: string,
  data: InsertProduct
) {
  const existing = await getDb()
    .select()
    .from(schema.products)
    .where(eq(schema.products.tiendanubeId, tiendanubeId))
    .limit(1);

  if (existing.at(0)) {
    await getDb()
      .update(schema.products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.products.tiendanubeId, tiendanubeId));
    return existing[0].id;
  } else {
    const result = await getDb().insert(schema.products).values(data).$returningId();
    return result[0]?.id;
  }
}
