import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let rawPool: mysql.Pool;

function parseDbUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || "3306"),
      user: u.username,
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

function createPool() {
  if (!rawPool) {
    const parsed = parseDbUrl(env.databaseUrl);
    // Forzar IPv4 para evitar problemas con IPv6 en Hostinger
    const host = (parsed?.host === "localhost" ? "127.0.0.1" : parsed?.host) || "127.0.0.1";
    rawPool = mysql.createPool({
      host,
      port: parsed?.port || 3306,
      user: parsed?.user || "u346820500_kanokaiser",
      password: parsed?.password || "Pepe4276",
      database: parsed?.database || "u346820500_diegs",
      connectionLimit: 10,
      enableKeepAlive: true,
    });
  }
  return rawPool;
}

export function getDb() {
  if (!instance) {
    const pool = createPool();
    instance = drizzle(pool, { schema: fullSchema, mode: "default" });
  }
  return instance;
}

/** Export raw pool para queries directas (syncJob, etc) */
export function getDbRawPool(): mysql.Pool {
  return createPool();
}
