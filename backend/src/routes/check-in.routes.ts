import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { createCheckIn } from "../services/access.service";
import { memberIdSchema, serializeMember } from "./scanner.routes";

const router = Router();
const checkInRequest = z.object({ memberId: memberIdSchema });

router.post("/", async (request, response, next) => {
  try {
    const parsed = checkInRequest.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, status: "ERROR", message: "Enter a valid member ID." });
      return;
    }

    // The server performs the membership decision again immediately before it
    // writes the audit event; no client-supplied access state is trusted.
    const { decision, checkIn, duplicate } = await createCheckIn(parsed.data.memberId, env.gymTimeZone);
    response.status(duplicate ? 200 : 201).json({
      success: decision.status === "ACTIVE",
      status: decision.status,
      message: decision.message,
      duplicate,
      checkIn: {
        id: checkIn._id.toString(),
        scannedAt: checkIn.scannedAt.toISOString(),
        result: checkIn.result,
      },
      member: decision.member ? serializeMember(decision.member) : undefined,
    });
  } catch (error) {
    next(error);
  }
});

export { router as checkInRouter };
