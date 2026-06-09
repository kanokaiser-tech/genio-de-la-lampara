import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { spawn } from "child_process";
import { restApi } from "./restApi";
import { aiModeration } from "./aiModeration";
import { uploadRouter } from "./uploadRouter";

const RESTART_TOKEN = "genio-restart-8f3k9m2p7q4r6t1w";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Endpoint de reinicio de emergencia
app.post("/api/restart", async (c) => {
  try {
    const body = await c.req.json();
    if (body.token !== RESTART_TOKEN) {
      return c.json({ error: "Invalid token" }, 403);
    }

    const child = spawn(
      "bash",
      ["-c", `
        sleep 3
        for pid in $(ps aux | grep '[n]ode' | awk '{print $2}'); do kill -9 $pid 2>/dev/null; done
        sleep 1
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        cd ${process.env.REPO_DIR || "/home/u346820500/domains/geniorevendedores.geniodelalampara.com/repo"}
        PORT=3002 nohup node dist/boot.js > backend.log 2>&1 &
      `],
      { detached: true, stdio: "ignore" }
    );
    child.unref();

    return c.json({
      success: true,
      message: "Restarting in 3-5 seconds",
      status: "restarting"
    });
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", time: new Date().toISOString() });
});

// REST API para n8n/DeepSeek
app.route("/api/rest", restApi);
app.route("/api/ai", aiModeration);
app.route("/api/upload", uploadRouter);

// OAuth callback
app.get(Paths.oauthCallback, async (c) => createOAuthCallbackHandler(c));

// tRPC endpoints
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, async () => {
    console.log(`Server running on http://localhost:${port}/`);

    const { runMigrations } = await import("./migrations/run_migrations");
    // await runMigrations();
  });
}

// Servir archivos de uploads (imágenes)
app.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "public", "uploads", filename);
  
  if (fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    }[ext] || "application/octet-stream";
    
    c.header("Content-Type", contentType);
    return c.body(file);
  }
  return c.json({ error: "File not found" }, 404);
});
