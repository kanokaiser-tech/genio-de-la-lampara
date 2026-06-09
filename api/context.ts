import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./localAuth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  
  try {
    // Autenticación normal por sesión/token
    ctx.user = (await authenticateRequest(opts.req.headers)) ?? undefined;
  } catch {
    // Auth is optional
  }
  
  return ctx;
}
