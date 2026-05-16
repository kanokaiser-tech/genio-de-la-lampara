import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(...roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// Any authenticated user
export const authedQuery = t.procedure.use(requireAuth);

// Admin only (superadmin or admin)
export const adminQuery = authedQuery.use(requireRole("superadmin", "admin"));

// Superadmin only
export const superadminQuery = authedQuery.use(requireRole("superadmin"));

// Revendedor only
export const revendedorQuery = authedQuery.use(requireRole("revendedor"));

// Admin or revendedor (for shared endpoints)
export const userQuery = authedQuery.use(requireRole("superadmin", "admin", "revendedor"));
