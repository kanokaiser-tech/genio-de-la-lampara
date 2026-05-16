import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

// ============================================================
// Local Users - email/password authentication
// ============================================================
export const localUsers = mysqlTable("localUsers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  unionId: varchar("unionId", { length: 255 }),
  avatar: text("avatar"),
  phone: varchar("phone", { length: 50 }),
  role: mysqlEnum("role", ["superadmin", "admin", "revendedor"])
    .default("revendedor")
    .notNull(),
  parentId: bigint("parentId", { mode: "number", unsigned: true }),
  discountType: mysqlEnum("discountType", ["efectivo", "transferencia"]).default("efectivo"),
  lastSignInAt: timestamp("lastSignInAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

// ============================================================
// Products - imported from Tiendanube or created manually
// ============================================================
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  priceList: decimal("priceList", { precision: 12, scale: 2 }).notNull(),
  priceCash30: decimal("priceCash30", { precision: 12, scale: 2 }).notNull(),
  priceTransfer25: decimal("priceTransfer25", { precision: 12, scale: 2 }).notNull(),
  stock: int("stock").default(0).notNull(),
  imageUrl: text("imageUrl"),
  tiendanubeId: varchar("tiendanubeId", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ============================================================
// Orders - pedidos de revendedores
// ============================================================
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  adminId: bigint("adminId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  paymentType: mysqlEnum("paymentType", ["efectivo", "transferencia"]).notNull(),
  notes: text("notes"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  webhookSent: boolean("webhookSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ============================================================
// Order Items - productos dentro de cada pedido
// ============================================================
export const orderItems = mysqlTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  productName: varchar("productName", { length: 500 }).notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ============================================================
// Cart Items - carrito persistente por usuario
// ============================================================
export const cartItems = mysqlTable("cartItems", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ============================================================
// Settings - configuracion global de la tienda
// ============================================================
export const settings = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  storeName: varchar("storeName", { length: 255 }).default("Genio de la Lampara").notNull(),
  whatsappNumber: varchar("whatsappNumber", { length: 50 }),
  tiendanubeApiToken: text("tiendanubeApiToken"),
  tiendanubeStoreId: varchar("tiendanubeStoreId", { length: 100 }),
  webhookUrl: text("webhookUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
