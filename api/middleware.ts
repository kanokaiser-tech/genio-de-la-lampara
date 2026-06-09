import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// API Keys válidas
const VALID_API_KEYS = [
  "sk-85ef8b9e1ff446d4822407982dbf742e",  // DeepSeek
  "n8n-secret-key-2026",                    // n8n
];

function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return VALID_API_KEYS.includes(apiKey);
}

function createApiKeyContext() {
  return {
    user: {
      id: 0,
      email: "api@genio.com",
      name: "API Bot",
      role: "superadmin",
      isAdmin: true,
      isSuperadmin: true,
    },
    isApiKey: true,
  };
}

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Middleware que acepta API Key O autenticación normal
const requireAuth = t.middleware(async ({ ctx, next }) => {
  // Primero, verificar si hay API Key en los headers
  const apiKey = ctx.req?.headers?.["x-api-key"] as string || 
                 ctx.req?.headers?.["authorization"]?.replace("Bearer ", "");
  
  if (apiKey && validateApiKey(apiKey)) {
    // Es una API Key válida, le damos contexto de superadmin
    const apiContext = createApiKeyContext();
    return next({ ctx: { ...ctx, user: apiContext.user, isApiKey: true } });
  }
  
  // Si no hay API Key válida, verificar usuario normal
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: ErrorMessages.unauthenticated });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(...roles: string[]) {
  return t.middleware(async ({ ctx, next }) => {
    // superadmin siempre pasa (incluyendo API Key)
    if (!ctx.user || (!roles.includes(ctx.user.role) && ctx.user.role !== "superadmin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
export const superadminQuery = t.procedure.use(requireRole("superadmin"));
export const revendedorQuery = authedQuery.use(requireRole("revendedor"));
export const userQuery = authedQuery.use(requireRole("admin", "revendedor"));
