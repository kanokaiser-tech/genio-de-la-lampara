import * as jose from "jose";
import bcrypt from "bcryptjs";
import { findUserById } from "./queries/localUsers";
import type { LocalUser } from "@db/schema";

const SECRET = new TextEncoder().encode(
  process.env.APP_SECRET || "local-auth-secret-key-change-me"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signLocalToken(userId: number): Promise<string> {
  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyLocalToken(
  token: string
): Promise<number | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET, {
      clockTolerance: 60,
    });
    return payload.userId as number;
  } catch {
    return null;
  }
}

export async function authenticateLocalRequest(
  headers: Headers
): Promise<LocalUser | null> {
  const authHeader = headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const userId = await verifyLocalToken(token);
  if (!userId) return null;

  return (await findUserById(userId)) ?? null;
}
