import { connectDB } from "@/lib/db/mongodb";
import { Payment, Plan, Subscription, Ticket, User } from "@/lib/models";
import { generateOpaqueToken } from "@/lib/auth/session";
import mongoose from "mongoose";

export async function generateNextMemberId(): Promise<string> {
  const users = await User.find({ memberId: { $exists: true, $ne: null } })
    .select("memberId")
    .lean();

  const maxNum = users.reduce((max, u) => {
    if (!u.memberId) return max;
    const match = u.memberId.match(/GYM-(\d+)/);
    if (!match) return max;
    const val = parseInt(match[1], 10);
    return isNaN(val) ? max : Math.max(max, val);
  }, 125);

  const nextNum = maxNum + 1;
  return `GYM-${String(nextNum).padStart(6, "0")}`;
}

export async function activateMembership({
  userId,
  planId,
  paymentId,
}: {
  userId: string | mongoose.Types.ObjectId;
  planId: string | mongoose.Types.ObjectId;
  paymentId?: string | mongoose.Types.ObjectId;
}) {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) throw new Error("User record not found");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Membership plan not found");

  // Ensure member ID exists
  if (!user.memberId) {
    user.memberId = await generateNextMemberId();
    await user.save();
  }

  // Calculate start & end date (if previous active membership exists, extend it)
  const today = new Date();
  const existingSub = await Subscription.findOne({
    userId: user._id,
    status: "ACTIVE",
    endDate: { $gte: today },
  }).sort({ endDate: -1 });

  let startDate = new Date();
  let baseEndDate = new Date();

  if (existingSub && existingSub.endDate > today) {
    baseEndDate = new Date(existingSub.endDate);
  }

  // Add duration
  const endDate = new Date(baseEndDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // Create new active subscription
  const subscription = await Subscription.create({
    userId: user._id,
    planId: plan._id,
    planName: plan.name,
    startDate,
    endDate,
    status: "ACTIVE",
    paymentId: paymentId ? new mongoose.Types.ObjectId(paymentId.toString()) : undefined,
  });

  // Generate or reissue digital ticket with opaque token
  const ticketToken = generateOpaqueToken("TKT");
  const qrPayload = JSON.stringify({
    memberId: user.memberId,
    ticketToken,
    club: "Elite Fitness Addis Ababa",
  });

  // Revoke any previous tickets for safety
  await Ticket.updateMany(
    { userId: user._id, isRevoked: false },
    { isRevoked: true, revokedReason: "Replaced by new membership plan activation" }
  );

  const ticket = await Ticket.create({
    ticketToken,
    memberId: user.memberId,
    userId: user._id,
    subscriptionId: subscription._id,
    qrPayload,
    isRevoked: false,
  });

  // Update payment with subscription reference if available
  if (paymentId) {
    await Payment.findByIdAndUpdate(paymentId, {
      subscriptionId: subscription._id,
      status: "COMPLETED",
    });
  }

  return {
    subscription,
    ticket,
    memberId: user.memberId,
  };
}
