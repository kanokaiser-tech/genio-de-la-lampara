import { Hono } from "hono";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export const uploadRouter = new Hono();

uploadRouter.post("/images", async (c) => {
  try {
    const body = await c.req.parseBody({ all: true });
    const files = body["images"];
    const fileArray = Array.isArray(files) ? files : files ? [files] : [];
    
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    
    const urls = [];
    for (const file of fileArray) {
      if (file && typeof file !== "string" && "name" in file && "type" in file) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = uniqueSuffix + (file.name?.substring(file.name.lastIndexOf(".")) || ".jpg");
        const filepath = join(uploadDir, filename);
        
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        writeFileSync(filepath, uint8Array);
        
        urls.push(`/uploads/${filename}`);
      }
    }
    
    return c.json({ success: true, urls });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Error al subir archivos" }, 500);
  }
});
