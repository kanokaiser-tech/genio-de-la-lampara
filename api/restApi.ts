import { Hono } from "hono";
import { getDb } from "./queries/connection";

const VALID_API_KEYS = [
  "sk-85ef8b9e1ff446d4822407982dbf742e",
  "n8n-secret-key-2026",
];

export const restApi = new Hono();

// Middleware de API Key
restApi.use("*", async (c, next) => {
  const apiKey = c.req.header("x-api-key") || c.req.query("apiKey");
  if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
    return c.json({ error: "Invalid API Key" }, 401);
  }
  await next();
});

// GET /api/rest/stock - Stock de todos los productos
restApi.get("/stock", async (c) => {
  const db = getDb();
  const [rows] = await db.execute(
    "SELECT id, name, stock, priceList, priceCash30, priceTransfer25 FROM products WHERE active = true ORDER BY name"
  );
  return c.json({ success: true, products: rows });
});

// GET /api/rest/stock/:id - Stock de un producto
restApi.get("/stock/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const [rows] = await db.execute(
    "SELECT id, name, stock, priceList, priceCash30, priceTransfer25 FROM products WHERE id = ? AND active = true",
    [id]
  );
  const products = rows as any[];
  if (products.length === 0) {
    return c.json({ error: "Producto no encontrado" }, 404);
  }
  return c.json({ success: true, product: products[0] });
});

// GET /api/rest/products - Buscar productos
restApi.get("/products", async (c) => {
  const search = c.req.query("search") || "";
  const limit = parseInt(c.req.query("limit") || "50");
  const db = getDb();
  
  let query = "SELECT id, name, category, stock, priceList FROM products WHERE active = true";
  const params: any[] = [];
  
  if (search) {
    query += " AND (name LIKE ? OR category LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  query += " ORDER BY name LIMIT ?";
  params.push(limit);
  
  const [rows] = await db.execute(query, params);
  return c.json({ success: true, count: (rows as any[]).length, products: rows });
});

// GET /api/rest/categories - Categorías con stock total
restApi.get("/categories", async (c) => {
  const db = getDb();
  const [rows] = await db.execute(
    "SELECT category, COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE active = true GROUP BY category ORDER BY category"
  );
  return c.json({ success: true, categories: rows });
});

// GET /api/rest/orders/:email - Pedidos de un revendedor
restApi.get("/orders/:email", async (c) => {
  const email = c.req.param("email");
  const db = getDb();
  const [rows] = await db.execute(
    `SELECT o.id, o.status, o.paid, o.totalAmount, o.createdAt, u.name as userName 
     FROM orders o 
     JOIN users u ON o.userId = u.id 
     WHERE u.email = ? 
     ORDER BY o.createdAt DESC 
     LIMIT 20`,
    [email]
  );
  return c.json({ success: true, orders: rows });
});

// GET /api/rest/stats - Estadísticas generales
restApi.get("/stats", async (c) => {
  const db = getDb();
  const [productCount] = await db.execute("SELECT COUNT(*) as total FROM products WHERE active = true");
  const [lowStock] = await db.execute("SELECT COUNT(*) as low FROM products WHERE stock < 5 AND active = true");
  const [orderStats] = await db.execute("SELECT COUNT(*) as pending FROM orders WHERE status = 'pending'");
  
  return c.json({
    success: true,
    stats: {
      totalProducts: (productCount as any[])[0].total,
      lowStockProducts: (lowStock as any[])[0].low,
      pendingOrders: (orderStats as any[])[0].pending,
    }
  });
});
