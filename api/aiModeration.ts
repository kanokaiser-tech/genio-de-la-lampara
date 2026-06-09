import { Hono } from "hono";
import { getDb } from "./queries/connection";

const VALID_API_KEYS = [
  "sk-85ef8b9e1ff446d4822407982dbf742e",
  "n8n-secret-key-2026",
];

// Palabras prohibidas
const FORBIDDEN_WORDS = [
  "droga", "cocaína", "marihuana", "weed", "cannabis", "lcd", "mdma",
  "extasis", "merca", "perico", "crack", "heroína", "fentanilo",
  "arma", "pistola", "revólver", "escopeta", "rifle", "machete",
  "navaja", "cuchillo", "explosivo", "bomba", "ilegal", "hack",
  "clonar", "tarjeta", "dólar", "dolares", "moneda extranjera"
];

// Categorías permitidas
const ALLOWED_CATEGORIES = [
  "celulares", "telefonos", "iphone", "samsung", "xiaomi", "motorola",
  "notebooks", "laptops", "computadoras", "tablets", "ipad",
  "consolas", "playstation", "xbox", "nintendo", "videojuegos",
  "electrodomesticos", "tv", "televisor", "monitor", "auriculares",
  "parlantes", "accesorios", "cargadores", "fundas", "mochilas"
];

export const aiModeration = new Hono();

// Middleware de API Key
aiModeration.use("*", async (c, next) => {
  const apiKey = c.req.header("x-api-key") || c.req.query("apiKey");
  if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
    return c.json({ error: "Invalid API Key" }, 401);
  }
  await next();
});

// Endpoint para moderar una publicación con IA
aiModeration.post("/moderate", async (c) => {
  const body = await c.req.json();
  const { title, description, category, productId } = body;
  
  const textToCheck = `${title} ${description || ""}`.toLowerCase();
  
  // 1. Verificar palabras prohibidas
  const foundForbidden = FORBIDDEN_WORDS.filter(word => textToCheck.includes(word));
  if (foundForbidden.length > 0) {
    return c.json({
      approved: false,
      reason: `Contiene palabras prohibidas: ${foundForbidden.join(", ")}`,
      action: "reject"
    });
  }
  
  // 2. Verificar si es un producto que VOS vendés (para no permitir que revendedores compitan)
  // Esto consulta tu catálogo de productos
  const db = getDb();
  const [existingProducts] = await db.execute(
    "SELECT id, name FROM products WHERE name LIKE ? AND active = true LIMIT 1",
    [`%${title}%`]
  );
  
  if ((existingProducts as any[]).length > 0) {
    return c.json({
      approved: false,
      reason: "Este producto ya lo vendés vos en tu catálogo. No se permite que revendedores lo publiquen.",
      action: "reject"
    });
  }
  
  // 3. Verificar categoría permitida
  const categoryAllowed = ALLOWED_CATEGORIES.some(cat => 
    category?.toLowerCase().includes(cat) || textToCheck.includes(cat)
  );
  
  if (!categoryAllowed && category) {
    return c.json({
      approved: false,
      reason: `Categoría "${category}" no permitida. Solo se permiten: celulares, notebooks, tablets, consolas, electrodomésticos usados.`,
      action: "reject"
    });
  }
  
  // 4. Si pasa todas las verificaciones, aprobar
  if (productId) {
    await db.execute(
      "UPDATE vendor_products SET status = 'approved', soft_message = 'Aprobado automáticamente por IA' WHERE id = ?",
      [productId]
    );
  }
  
  return c.json({
    approved: true,
    reason: "Producto aprobado automáticamente",
    action: "approve"
  });
});

// Endpoint para procesar TODOS los pendientes
aiModeration.post("/process-pending", async (c) => {
  const db = getDb();
  
  // Obtener todos los productos pendientes
  const [pending] = await db.execute(
    "SELECT id, title, description, category FROM vendor_products WHERE status = 'pending'"
  );
  
  const results = [];
  for (const product of (pending as any[])) {
    const textToCheck = `${product.title} ${product.description || ""}`.toLowerCase();
    
    const foundForbidden = FORBIDDEN_WORDS.filter(word => textToCheck.includes(word));
    if (foundForbidden.length > 0) {
      await db.execute(
        "UPDATE vendor_products SET status = 'rejected', rejection_reason = ? WHERE id = ?",
        [`Contenido prohibido: ${foundForbidden.join(", ")}`, product.id]
      );
      results.push({ id: product.id, status: "rejected", reason: foundForbidden.join(", ") });
      continue;
    }
    
    const [existingProducts] = await db.execute(
      "SELECT id FROM products WHERE name LIKE ? AND active = true LIMIT 1",
      [`%${product.title}%`]
    );
    
    if ((existingProducts as any[]).length > 0) {
      await db.execute(
        "UPDATE vendor_products SET status = 'rejected', rejection_reason = ? WHERE id = ?",
        ["Producto duplicado con tu catálogo", product.id]
      );
      results.push({ id: product.id, status: "rejected", reason: "Producto ya vendido por el admin" });
      continue;
    }
    
    await db.execute(
      "UPDATE vendor_products SET status = 'approved', soft_message = 'Aprobado automáticamente por IA' WHERE id = ?",
      [product.id]
    );
    results.push({ id: product.id, status: "approved", reason: "Aprobado automáticamente" });
  }
  
  return c.json({
    processed: results.length,
    results
  });
});

// Endpoint para que DeepSeek analice un texto
aiModeration.post("/analyze", async (c) => {
  const body = await c.req.json();
  const { text } = body;
  
  if (!text) {
    return c.json({ error: "Se requiere texto" }, 400);
  }
  
  const textLower = text.toLowerCase();
  const foundForbidden = FORBIDDEN_WORDS.filter(word => textLower.includes(word));
  
  // Detectar si es un celular usado o notebook
  const isPhone = /\b(celular|telefono|iphone|samsung|xiaomi|motorola|huawei|lg|phone|smartphone)\b/i.test(text);
  const isLaptop = /\b(notebook|laptop|computadora|pc portatil|macbook)\b/i.test(text);
  const isTablet = /\b(tablet|ipad|galaxy tab)\b/i.test(text);
  const isConsole = /\b(playstation|xbox|nintendo|switch|ps4|ps5)\b/i.test(text);
  
  const isAllowed = isPhone || isLaptop || isTablet || isConsole;
  
  return c.json({
    isAllowed,
    isForbidden: foundForbidden.length > 0,
    forbiddenWords: foundForbidden,
    detectedType: {
      phone: isPhone,
      laptop: isLaptop,
      tablet: isTablet,
      console: isConsole
    },
    suggestion: isAllowed && foundForbidden.length === 0 
      ? "Producto permitido" 
      : "Producto no permitido"
  });
});
