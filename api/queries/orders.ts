import { eq, and, desc } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertOrder, InsertOrderItem } from "@db/schema";
import { getDb } from "./connection";

export async function getAllOrders() {
  return getDb()
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt));
}

export async function getOrderById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id))
    .limit(1);
  return rows.at(0);
}

export async function getOrdersByUserId(userId: number) {
  return getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt));
}

export async function getOrdersByAdminId(adminId: number) {
  return getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.adminId, adminId))
    .orderBy(desc(schema.orders.createdAt));
}

export async function getPendingOrdersByAdminId(adminId: number) {
  return getDb()
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.adminId, adminId),
        eq(schema.orders.status, "pending")
      )
    )
    .orderBy(desc(schema.orders.createdAt));
}

export async function createOrder(data: InsertOrder) {
  const result = await getDb().insert(schema.orders).values(data).$returningId();
  return result[0]?.id;
}

export async function updateOrderStatus(
  id: number,
  status: "pending" | "approved" | "rejected"
) {
  await getDb()
    .update(schema.orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.orders.id, id));
}

export async function markWebhookSent(id: number) {
  await getDb()
    .update(schema.orders)
    .set({ webhookSent: true, updatedAt: new Date() })
    .where(eq(schema.orders.id, id));
}

// Order Items
export async function getOrderItemsByOrderId(orderId: number) {
  return getDb()
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
}

export async function createOrderItem(data: InsertOrderItem) {
  await getDb().insert(schema.orderItems).values(data);
}

export async function createOrderItems(items: InsertOrderItem[]) {
  if (items.length === 0) return;
  await getDb().insert(schema.orderItems).values(items);
}

// Get full order with items
export async function getOrderWithItems(orderId: number) {
  const order = await getOrderById(orderId);
  if (!order) return null;
  const items = await getOrderItemsByOrderId(orderId);
  return { ...order, items };
}
