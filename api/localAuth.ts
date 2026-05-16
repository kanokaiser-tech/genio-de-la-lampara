import * as jose from "jose";
import bcrypt from "bcryptjs";
import { env } from "./lib/env";
import { findUserById } from "./queries/users";

const JWT_ALG = "HS256";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(userId: number): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function authenticateRequest(headers: Headers) {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const tokenMatch = cookie.match(/auth_token=([^;]+)/);
  if (!tokenMatch) return null;
  const token = decodeURIComponent(tokenMatch[1]);
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG], clockTolerance: 60 });
    const userId = payload.sub ? Number(payload.sub) : null;
    if (!userId) return null;
    return findUserById(userId) ?? null;
  } catch {
    return null;
  }
}
