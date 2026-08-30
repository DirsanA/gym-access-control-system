import jwt from "jsonwebtoken";
import { env } from "../config/env";

type TokenPayload = { sub: string; email: string; role: "ADMIN" };

export function createAdminToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "8h", subject: payload.sub });
}

export function verifyAdminToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string" || decoded.role !== "ADMIN" || !decoded.sub || !decoded.email) {
    throw new Error("Invalid admin token");
  }
  return { sub: decoded.sub, email: decoded.email, role: "ADMIN" };
}
