import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { checkInRouter } from "./routes/check-in.routes";
import { memberRouter } from "./routes/member.routes";
import { scannerRouter } from "./routes/scanner.routes";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json({ limit: "32kb" }));
app.use(
  "/api",
  rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-8", legacyHeaders: false })
);

app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/scanner", scannerRouter);
app.use("/api/check-ins", checkInRouter);
app.use("/api/members", memberRouter);
app.use(errorHandler);
