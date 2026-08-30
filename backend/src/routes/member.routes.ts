import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { authenticateAdmin } from "../middleware/authenticate";
import { MemberModel, type MemberDocument } from "../models/member.model";
import { nextMemberId } from "../services/member-id.service";
import { membershipStatus } from "../services/membership.service";
import { dateKey, parseDateOnly, todayInTimeZone } from "../utils/date";

const router = Router();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates");
const memberInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.email().optional().or(z.literal("")),
  profileImage: z.string().url().max(1_000).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  dateOfBirth: dateOnly.optional(),
  membershipPlan: z.string().trim().min(2).max(80),
  membershipStartDate: dateOnly,
  membershipEndDate: dateOnly,
  isActive: z.boolean().optional(),
});
const memberUpdate = memberInput.partial();

function serialize(member: MemberDocument) {
  return {
    id: member._id.toString(), memberId: member.memberId, fullName: member.fullName, phone: member.phone,
    email: member.email ?? null, profileImage: member.profileImage ?? null, gender: member.gender ?? null,
    dateOfBirth: member.dateOfBirth ? dateKey(member.dateOfBirth) : null, membershipPlan: member.membershipPlan,
    membershipStartDate: dateKey(member.membershipStartDate), membershipEndDate: dateKey(member.membershipEndDate),
    isActive: member.isActive, status: membershipStatus(member, env.gymTimeZone), createdAt: member.createdAt.toISOString(),
  };
}

function applyInput(member: MemberDocument, input: z.infer<typeof memberUpdate>): void {
  if (input.fullName !== undefined) member.fullName = input.fullName;
  if (input.phone !== undefined) member.phone = input.phone;
  if (input.email !== undefined) member.email = input.email || undefined;
  if (input.profileImage !== undefined) member.profileImage = input.profileImage || undefined;
  if (input.gender !== undefined) member.gender = input.gender;
  if (input.dateOfBirth !== undefined) member.dateOfBirth = parseDateOnly(input.dateOfBirth);
  if (input.membershipPlan !== undefined) member.membershipPlan = input.membershipPlan;
  if (input.membershipStartDate !== undefined) member.membershipStartDate = parseDateOnly(input.membershipStartDate);
  if (input.membershipEndDate !== undefined) member.membershipEndDate = parseDateOnly(input.membershipEndDate);
  if (input.isActive !== undefined) member.isActive = input.isActive;
  if (member.membershipStartDate > member.membershipEndDate) throw new Error("Membership end date must be after the start date.");
}

router.use(authenticateAdmin);

router.get("/", async (request, response, next) => {
  try {
    const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
    const filter = typeof request.query.filter === "string" ? request.query.filter : "ALL";
    const query = search ? { $or: [{ memberId: new RegExp(search, "i") }, { fullName: new RegExp(search, "i") }, { phone: new RegExp(search, "i") }] } : {};
    const members = await MemberModel.find(query).sort({ createdAt: -1 }).limit(250).exec();
    const visible = members.filter((member) => filter === "ALL" || membershipStatus(member, env.gymTimeZone) === filter);
    response.json({ success: true, members: visible.map(serialize) });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const parsed = memberInput.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ success: false, message: "Please check the member information." }); return; }
    const member = new MemberModel({ memberId: await nextMemberId() });
    applyInput(member, parsed.data);
    await member.save();
    response.status(201).json({ success: true, member: serialize(member) });
  } catch (error) { next(error); }
});

router.patch("/:memberId", async (request, response, next) => {
  try {
    const parsed = memberUpdate.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ success: false, message: "Please check the member information." }); return; }
    const member = await MemberModel.findOne({ memberId: request.params.memberId.toUpperCase() }).exec();
    if (!member) { response.status(404).json({ success: false, message: "Member not found." }); return; }
    applyInput(member, parsed.data);
    await member.save();
    response.json({ success: true, member: serialize(member) });
  } catch (error) { next(error); }
});

router.post("/:memberId/renew", async (request, response, next) => {
  try {
    const months = z.object({ months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]) }).safeParse(request.body);
    if (!months.success) { response.status(400).json({ success: false, message: "Select a valid renewal period." }); return; }
    const member = await MemberModel.findOne({ memberId: request.params.memberId.toUpperCase() }).exec();
    if (!member) { response.status(404).json({ success: false, message: "Member not found." }); return; }

    const today = parseDateOnly(todayInTimeZone(env.gymTimeZone));
    const end = new Date(member.membershipEndDate);
    const start = end >= today ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1)) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const renewedEnd = new Date(start);
    renewedEnd.setUTCMonth(renewedEnd.getUTCMonth() + months.data.months);
    renewedEnd.setUTCDate(renewedEnd.getUTCDate() - 1);

    member.membershipStartDate = start;
    member.membershipEndDate = renewedEnd;
    member.isActive = true;
    await member.save();
    response.json({ success: true, member: serialize(member) });
  } catch (error) { next(error); }
});

router.delete("/:memberId", async (request, response, next) => {
  try {
    const deleted = await MemberModel.findOneAndDelete({ memberId: request.params.memberId.toUpperCase() }).exec();
    if (!deleted) { response.status(404).json({ success: false, message: "Member not found." }); return; }
    response.json({ success: true });
  } catch (error) { next(error); }
});

export { router as memberRouter };
