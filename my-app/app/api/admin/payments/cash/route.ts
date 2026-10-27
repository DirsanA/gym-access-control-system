import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { activateMembership } from "@/lib/memberships/activate";
import { Payment, Plan, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, planId, amountETB, adminNotes } = body;

    if (!userId || !planId) {
      return NextResponse.json({ success: false, message: "User ID and Plan ID are required." }, { status: 400 });
    }

    await connectDB();

    const customer = await User.findById(userId);
    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer account not found." }, { status: 404 });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return NextResponse.json({ success: false, message: "Membership plan not found." }, { status: 404 });
    }

    const finalAmount = Number(amountETB) || plan.priceETB;
    const txRef = `CASH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create cash payment record with audit trail
    const payment = await Payment.create({
      userId: customer._id,
      planId: plan._id,
      amountETB: finalAmount,
      currency: "ETB",
      provider: "CASH",
      status: "COMPLETED",
      txRef,
      confirmedByAdminId: session.userId,
      adminNotes: adminNotes?.trim() || "Cash collected and verified at front desk",
    });

    // Activate membership & issue encrypted digital ticket
    const activation = await activateMembership({
      userId: customer._id,
      planId: plan._id,
      paymentId: payment._id,
    });

    return NextResponse.json({
      success: true,
      message: `Cash payment recorded successfully for ${customer.fullName || customer.username}. Membership activated.`,
      payment,
      activation,
    });
  } catch (error: any) {
    console.error("[ADMIN_CASH_PAYMENT_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to record cash payment." }, { status: 500 });
  }
}
