import type { RequestHandler } from "express";
import { verifyAdminToken } from "../services/auth.service";

export const authenticateAdmin: RequestHandler = (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    response.status(401).json({ success: false, message: "Authentication is required." });
    return;
  }

  try {
    const payload = verifyAdminToken(token);
    request.admin = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    response.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
  }
};
