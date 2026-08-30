import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { verifyAccess } from "../services/access.service";
import { dateKey } from "../utils/date";

const router = Router();
const memberIdSchema = z.string().trim().toUpperCase().regex(/^GYM-\d{6,}$/, "Invalid member ID");

function serializeMember(member: NonNullable<Awaited<ReturnType<typeof verifyAccess>>["member"]>) {
  return {
    memberId: member.memberId,
    fullName: member.fullName,
    profileImage: member.profileImage ?? null,
    membershipPlan: member.membershipPlan,
    membershipStartDate: dateKey(member.membershipStartDate),
    membershipEndDate: dateKey(member.membershipEndDate),
  };
}

router.get("/:memberId", async (request, response, next) => {
  try {
    const parsed = memberIdSchema.safeParse(request.params.memberId);
    if (!parsed.success) {
      response.status(400).json({ success: false, status: "ERROR", message: "Enter a valid member ID." });
      return;
    }

    const decision = await verifyAccess(parsed.data, env.gymTimeZone);
    if (decision.status === "NOT_FOUND") {
      response.status(404).json({ success: false, status: "NOT_FOUND", message: decision.message });
      return;
    }

    if (!decision.member) {
      throw new Error("A member was expected for this access decision");
    }

    response.json({
      success: true,
      status: decision.status,
      message: decision.message,
      member: serializeMember(decision.member),
    });
  } catch (error) {
    next(error);
  }
});

export { router as scannerRouter, memberIdSchema, serializeMember };
