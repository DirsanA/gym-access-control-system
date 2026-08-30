import { type HydratedDocument } from "mongoose";
import { CheckInModel, type CheckIn } from "../models/check-in.model";
import { MemberModel, type MemberDocument } from "../models/member.model";
import { membershipStatus } from "./membership.service";

export type AccessStatus = "ACTIVE" | "EXPIRED" | "NOT_FOUND";

export type AccessDecision = {
  status: AccessStatus;
  message: string;
  member: MemberDocument | null;
};

export async function verifyAccess(memberId: string, timeZone: string): Promise<AccessDecision> {
  const member = await MemberModel.findOne({ memberId }).exec();
  if (!member) {
    return { status: "NOT_FOUND", message: "Member not found", member: null };
  }

  if (membershipStatus(member, timeZone) === "EXPIRED") {
    return { status: "EXPIRED", message: "Please renew your membership", member };
  }

  return { status: "ACTIVE", message: "Access granted", member };
}

export async function createCheckIn(
  memberId: string,
  timeZone: string
): Promise<{ decision: AccessDecision; checkIn: HydratedDocument<CheckIn>; duplicate: boolean }> {
  const decision = await verifyAccess(memberId, timeZone);
  const cooldownStart = new Date(Date.now() - 3_000);
  const duplicate = await CheckInModel.findOne({ memberId, createdAt: { $gte: cooldownStart } })
    .sort({ createdAt: -1 })
    .exec();

  if (duplicate) {
    return { decision, checkIn: duplicate, duplicate: true };
  }

  const result = decision.status === "ACTIVE" ? "SUCCESS" : decision.status;
  const checkIn = await CheckInModel.create({
    member: decision.member?._id ?? null,
    memberId,
    scannedAt: new Date(),
    result,
    membershipStatus: decision.status,
  });

  return { decision, checkIn, duplicate: false };
}
