import { connectDB } from "@/lib/db/mongodb";
import { findMemberAndTicket } from "@/lib/scanner-lookup";
import { ScanLog, Subscription, Ticket, User } from "@/lib/models";
import type { AccessResponse } from "@/types/scanner";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const search = searchParams.get("search")?.trim() || searchParams.get("query")?.trim() || "";
    const resultFilter = searchParams.get("result")?.trim().toUpperCase();

    const query: any = {};
    if (resultFilter && ["SUCCESS", "EXPIRED", "NOT_FOUND", "SUSPENDED", "REVOKED"].includes(resultFilter)) {
      query.result = resultFilter;
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ memberId: regex }, { message: regex }, { scannerId: regex }];
    }

    const [scans, total] = await Promise.all([
      ScanLog.find(query)
        .sort({ scannedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ScanLog.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("[CHECKINS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to load scan logs." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tokenInput = typeof body?.memberId === "string" ? body.memberId.trim() : "";

    if (!tokenInput) {
      return NextResponse.json({ success: false, status: "ERROR", message: "Scan payload is missing." }, { status: 400 });
    }

    await connectDB();

    const { user, ticket, resolvedToken } = await findMemberAndTicket(tokenInput);

    if (!user) {
      await ScanLog.create({
        memberId: tokenInput,
        result: "NOT_FOUND",
        message: "No member is registered with this ID or phone number.",
      });

      return NextResponse.json(
        {
          success: false,
          status: "NOT_FOUND",
          message: "No member is registered with this ID or phone number.",
        },
        { status: 404 }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

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
      profileImage: user.photoUrl || null,
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
