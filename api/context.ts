import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { LocalUser } from "@db/schema";
import { authenticateLocalRequest } from "./localAuth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: LocalUser;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateLocalRequest(opts.req.headers) ?? undefined;
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
