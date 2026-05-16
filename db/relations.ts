import { relations } from "drizzle-orm";
import { localUsers, products, orders, orderItems, cartItems } from "./schema";

export const localUsersRelations = relations(localUsers, ({ one, many }) => ({
  admin: one(localUsers, {
    fields: [localUsers.parentId],
    references: [localUsers.id],
    relationName: "adminRelation",
  }),
  revendedores: many(localUsers, {
    relationName: "adminRelation",
  }),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(localUsers, {
    fields: [orders.userId],
    references: [localUsers.id],
  }),
  admin: one(localUsers, {
    fields: [orders.adminId],
    references: [localUsers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(localUsers, {
    fields: [cartItems.userId],
    references: [localUsers.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));
