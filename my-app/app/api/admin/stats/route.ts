import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { Payment, ScanLog, Subscription, Ticket, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Parallelize all indexed counts, aggregations, and limit queries
    const [
      totalMembers,
      verifiedMembers,
      activeSubscriptions,
      revenueAgg,
      recentScans,
      recentPayments,
      expiringSoon,
    ] = await Promise.all([
      // Count customers
      User.countDocuments({ role: "customer" }),
      // Count verified customers
      User.countDocuments({ role: "customer", isVerified: true }),
      // Count active valid subscriptions
      Subscription.countDocuments({
        status: "ACTIVE",
        endDate: { $gte: today },
      }),
      // Aggregate completed revenue grouped by provider directly in MongoDB
      Payment.aggregate([
        { $match: { status: "COMPLETED" } },
        {
          $group: {
            _id: "$provider",
            total: { $sum: "$amountETB" },
          },
        },
      ]),
      // Recent scans (indexed by scannedAt: -1)
      ScanLog.find().sort({ scannedAt: -1 }).limit(10).lean(),
      // Recent payments (indexed by createdAt: -1)
      Payment.find()
        .populate("userId", "username fullName email memberId")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Memberships expiring in 7 days (indexed by status + endDate)
      Subscription.find({
        status: "ACTIVE",
        endDate: { $gte: today, $lte: nextWeek },
      })
        .populate("userId", "fullName username phone memberId")
        .sort({ endDate: 1 })
        .limit(10)
        .lean(),
    ]);

    let cashRevenueETB = 0;
    let onlineRevenueETB = 0;
    for (const r of revenueAgg) {
      if (r._id === "CASH") cashRevenueETB = r.total || 0;
      if (r._id === "CHAPA") onlineRevenueETB = r.total || 0;
    }
    const totalRevenueETB = cashRevenueETB + onlineRevenueETB;

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers,
        verifiedMembers,
        activeSubscriptions,
        totalRevenueETB,
        cashRevenueETB,
        onlineRevenueETB,
      },
      recentScans,
      recentPayments,
      expiringSoon,
    });
  } catch (error: any) {
    console.error("[ADMIN_STATS_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to load admin stats." }, { status: 500 });
  }
}
