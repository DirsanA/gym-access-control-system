import { connectDB } from "@/lib/db/mongodb";
import { Subscription, Ticket, User } from "@/lib/models";
import type { AccessResponse } from "@/types/scanner";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params;
    const tokenInput = decodeURIComponent(memberId).trim();

    if (!tokenInput) {
      return NextResponse.json({ success: false, status: "ERROR", message: "Member identifier is required." }, { status: 400 });
    }

    await connectDB();

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Look up by ticketToken or memberId fallback
    const ticket = await Ticket.findOne({
      $or: [
        { ticketToken: tokenInput },
        { memberId: tokenInput.toUpperCase() },
      ],
    }).populate("subscriptionId").populate("userId");

    let user = ticket?.userId as any;
    if (!user) {
      user = await User.findOne({ memberId: tokenInput.toUpperCase() });
    }

    if (!user) {
      return NextResponse.json({ success: false, status: "NOT_FOUND", message: "No member is registered with this ID." }, { status: 404 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          status: "EXPIRED",
          message: "Access Denied: Account has been suspended by management.",
          member: {
            memberId: user.memberId || "",
            fullName: user.fullName || user.username,
            membershipPlan: "Suspended",
            membershipStartDate: todayStr,
            membershipEndDate: todayStr,
            profileImage: user.photoUrl || null,
          },
        },
        { status: 403 }
      );
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "ACTIVE",
    }).sort({ endDate: -1 });

    const memberData = {
      memberId: user.memberId || "GYM-000000",
      fullName: user.fullName || user.username,
      membershipPlan: subscription?.planName || "No Active Plan",
      membershipStartDate: subscription ? subscription.startDate.toISOString().slice(0, 10) : todayStr,
      membershipEndDate: subscription ? subscription.endDate.toISOString().slice(0, 10) : todayStr,
      profileImage: user.photoUrl || null,
    };

    if (!subscription || subscription.endDate < today) {
      return NextResponse.json(
        {
          success: false,
          status: "EXPIRED",
          message: "This membership has expired.",
          member: memberData,
        },
        { status: 200 }
      );
    }

    const accessResponse: AccessResponse = {
      success: true,
      status: "ACTIVE",
      message: "Membership is active. Welcome in!",
      member: memberData,
    };

    return NextResponse.json(accessResponse);
  } catch (error: any) {
    return NextResponse.json({ success: false, status: "ERROR", message: error?.message || "Failed to query scanner." }, { status: 500 });
  }
}
