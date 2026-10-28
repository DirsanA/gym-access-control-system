import { connectDB } from "@/lib/db/mongodb";
import { Ticket, User } from "@/lib/models";
import { normalizePhoneNumber } from "@/lib/phone";
import mongoose from "mongoose";

export async function findMemberAndTicket(rawInput: string) {
  await connectDB();
  let token = rawInput.trim();

  // 1. If scanned JSON payload (from older QR passes), parse memberId or ticketToken
  if (token.startsWith("{") && token.endsWith("}")) {
    try {
      const parsed = JSON.parse(token);
      token = (parsed.memberId || parsed.ticketToken || token).trim();
    } catch {
      // ignore JSON parse error
    }
  }

  const cleanUpper = token.toUpperCase();
  const normalizedPhone = normalizePhoneNumber(token);

  // Build User search query matching memberId, phone, username, or ObjectId
  const userOrConditions: any[] = [
    { memberId: cleanUpper },
  ];

  // If input is purely digits or GYM-digits (e.g. 126 or 000126)
  const numericMatch = cleanUpper.match(/^(?:GYM-)?(\d+)$/);
  if (numericMatch) {
    const padded = `GYM-${numericMatch[1].padStart(6, "0")}`;
    userOrConditions.push({ memberId: padded });
  }

  // If phone number entered (e.g. 0911223344 or +251...)
  if (normalizedPhone) {
    userOrConditions.push({ phone: normalizedPhone });
    userOrConditions.push({ phone: `+251${normalizedPhone.replace(/^0/, "")}` });
    userOrConditions.push({ phone: normalizedPhone.replace(/^0/, "") });
    userOrConditions.push({ phone: new RegExp(normalizedPhone.replace(/^0/, ""), "i") });
  }

  // Also check if valid Mongo ObjectId
  if (mongoose.Types.ObjectId.isValid(token) && token.length === 24) {
    userOrConditions.push({ _id: new mongoose.Types.ObjectId(token) });
  }

  // Check Ticket first
  const ticket = await Ticket.findOne({
    $or: [
      { ticketToken: token },
      { memberId: cleanUpper },
      ...(numericMatch ? [{ memberId: `GYM-${numericMatch[1].padStart(6, "0")}` }] : []),
    ],
    isRevoked: false,
  }).populate("subscriptionId").populate("userId");

  let user = ticket?.userId as any;
  if (!user || !user._id) {
    user = await User.findOne({ $or: userOrConditions });
  }

  return { user, ticket, resolvedToken: cleanUpper };
}

