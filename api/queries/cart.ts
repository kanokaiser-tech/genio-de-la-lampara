import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertCartItem } from "@db/schema";
import { getDb } from "./connection";

export async function getCartByUserId(userId: number) {
  return getDb()
    .select()
    .from(schema.cartItems)
    .where(eq(schema.cartItems.userId, userId));
}

export async function getCartWithProducts(userId: number) {
  const cartItems = await getDb()
    .select()
    .from(schema.cartItems)
    .where(eq(schema.cartItems.userId, userId));

  if (cartItems.length === 0) return [];

  const result = [];
  for (const item of cartItems) {
    const product = await getDb()
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, item.productId))
      .limit(1);
    if (product.at(0)) {
      result.push({
        ...item,
        product: product[0],
      });
    }
  }
  return result;
}

export async function addToCart(data: InsertCartItem) {
  // Check if item already in cart
  const existing = await getDb()
    .select()
    .from(schema.cartItems)
    .where(
      and(
        eq(schema.cartItems.userId, data.userId),
        eq(schema.cartItems.productId, data.productId)
      )
    )
    .limit(1);

  if (existing.at(0)) {
    await getDb()
      .update(schema.cartItems)
      .set({
        quantity: existing[0].quantity + data.quantity,
        updatedAt: new Date(),
      })
      .where(eq(schema.cartItems.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await getDb().insert(schema.cartItems).values(data).$returningId();
    return result[0]?.id;
  }
}

export async function updateCartItemQuantity(
  userId: number,
  productId: number,
  quantity: number
) {
  if (quantity <= 0) {
    await getDb()
      .delete(schema.cartItems)
      .where(
        and(
          eq(schema.cartItems.userId, userId),
          eq(schema.cartItems.productId, productId)
        )
      );
    return;
  }

  await getDb()
    .update(schema.cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(
      and(
        eq(schema.cartItems.userId, userId),
        eq(schema.cartItems.productId, productId)
      )
    );
}

export async function removeFromCart(userId: number, productId: number) {
  await getDb()
    .delete(schema.cartItems)
    .where(
      and(
        eq(schema.cartItems.userId, userId),
        eq(schema.cartItems.productId, productId)
      )
    );
}

export async function clearCart(userId: number) {
  await getDb()
    .delete(schema.cartItems)
    .where(eq(schema.cartItems.userId, userId));
}
