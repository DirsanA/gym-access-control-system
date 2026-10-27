import { connectDB } from "@/lib/db/mongodb";
import { ScanLog, Subscription, Ticket, User } from "@/lib/models";
import type { AccessResponse } from "@/types/scanner";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tokenInput = typeof body?.memberId === "string" ? body.memberId.trim() : "";

    if (!tokenInput) {
      return NextResponse.json({ success: false, status: "ERROR", message: "Scan payload is missing." }, { status: 400 });
    }

    await connectDB();

    // Check if input is JSON from QR or plain string
    let parsedToken = tokenInput;
    let memberIdFromPayload = "";

    try {
      if (tokenInput.startsWith("{") && tokenInput.endsWith("}")) {
        const obj = JSON.parse(tokenInput);
        if (obj.ticketToken) parsedToken = obj.ticketToken;
        if (obj.memberId) memberIdFromPayload = obj.memberId;
      }
    } catch {
      // Use as string
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Look up by ticketToken or memberId fallback
    let ticket = await Ticket.findOne({
      $or: [
        { ticketToken: parsedToken },
        { memberId: parsedToken.toUpperCase() },
        ...(memberIdFromPayload ? [{ memberId: memberIdFromPayload.toUpperCase() }] : []),
      ],
    }).populate("subscriptionId").populate("userId");

    // If no ticket, attempt direct User lookup by memberId
    let user = ticket?.userId as any;
    if (!user) {
      user = await User.findOne({ memberId: parsedToken.toUpperCase() });
    }

    if (!user) {
      await ScanLog.create({
        memberId: parsedToken,
        result: "NOT_FOUND",
        message: "No member is registered with this ID/Token.",
      });

      return NextResponse.json(
        {
          success: false,
          status: "NOT_FOUND",
          message: "No member is registered with this ID or QR token.",
        },
        { status: 404 }
      );
    }

    // Check suspension
    if (user.isSuspended) {
      await ScanLog.create({
        ticketId: ticket?._id,
        memberId: user.memberId || "UNKNOWN",
        result: "SUSPENDED",
        message: "Member account is suspended.",
      });

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
            profileImage: null,
          },
        },
        { status: 403 }
      );
    }

    // Check ticket revocation
    if (ticket && ticket.isRevoked) {
      await ScanLog.create({
        ticketId: ticket._id,
        memberId: user.memberId,
        result: "REVOKED",
        message: "Ticket pass has been revoked or superseded.",
      });

      return NextResponse.json(
        {
          success: false,
          status: "EXPIRED",
          message: "Access Denied: This digital pass has been revoked or superseded.",
        },
        { status: 403 }
      );
    }

    // Find active subscription
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
      profileImage: null,
    };

    if (!subscription || subscription.endDate < today) {
      await ScanLog.create({
        ticketId: ticket?._id,
        memberId: user.memberId || "",
        result: "EXPIRED",
        message: "Membership has expired or is unpaid.",
      });

      return NextResponse.json(
        {
          success: false,
          status: "EXPIRED",
          message: "This membership has expired. Please renew at the front desk or profile.",
          member: memberData,
        },
        { status: 200 }
      );
    }

    // Access granted!
    await ScanLog.create({
      ticketId: ticket?._id,
      memberId: user.memberId,
      result: "SUCCESS",
      message: "Valid entrance check-in recorded.",
    });

    const accessResponse: AccessResponse = {
      success: true,
      status: "ACTIVE",
      message: "Membership is active. Welcome to Elite Fitness!",
      member: memberData,
    };

    return NextResponse.json({
      ...accessResponse,
      checkIn: {
        id: crypto.randomUUID(),
        scannedAt: new Date().toISOString(),
        result: "SUCCESS",
      },
    });
  } catch (error: any) {
    console.error("[SCANNER_CHECKIN_ERROR]", error);
    return NextResponse.json(
      { success: false, status: "ERROR", message: "Server error validating entrance scanner." },
      { status: 500 }
    );
  }
}
