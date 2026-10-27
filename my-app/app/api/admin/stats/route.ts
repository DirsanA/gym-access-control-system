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

    const totalMembers = await User.countDocuments({ role: "customer" });
    const verifiedMembers = await User.countDocuments({ role: "customer", isVerified: true });

    const today = new Date();
    const activeSubscriptions = await Subscription.countDocuments({
      status: "ACTIVE",
      endDate: { $gte: today },
    });

    // Revenue calculations (all completed payments)
    const completedPayments = await Payment.find({ status: "COMPLETED" });
    const totalRevenueETB = completedPayments.reduce((sum, p) => sum + (p.amountETB || 0), 0);

    const cashRevenueETB = completedPayments
      .filter((p) => p.provider === "CASH")
      .reduce((sum, p) => sum + (p.amountETB || 0), 0);

    const onlineRevenueETB = completedPayments
      .filter((p) => p.provider === "CHAPA")
      .reduce((sum, p) => sum + (p.amountETB || 0), 0);

    // Recent scans & check-ins
    const recentScans = await ScanLog.find().sort({ scannedAt: -1 }).limit(10);

    // Recent payments
    const recentPayments = await Payment.find()
      .populate("userId", "username fullName email memberId")
      .sort({ createdAt: -1 })
      .limit(10);

    // Memberships expiring within 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expiringSoon = await Subscription.find({
      status: "ACTIVE",
      endDate: { $gte: today, $lte: nextWeek },
    })
      .populate("userId", "fullName username phone memberId")
      .sort({ endDate: 1 });

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
