import { connectDB } from "@/lib/db/mongodb";
import { activateMembership } from "@/lib/memberships/activate";
import { Payment } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txRef = searchParams.get("tx_ref");

    if (!txRef) {
      return NextResponse.json({ success: false, message: "Transaction reference is required." }, { status: 400 });
    }

    await connectDB();
    const payment = await Payment.findOne({ txRef });
    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment record not found." }, { status: 404 });
    }

    // If already completed and membership active
    if (payment.status === "COMPLETED" && payment.subscriptionId) {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        message: "Payment verified and membership is active.",
        payment,
      });
    }

    const chapaSecret = process.env.CHAPA_SECRET_KEY || "";

    // Simulated test mode handling
    if (!chapaSecret || chapaSecret.includes("placeholder")) {
      const activation = await activateMembership({
        userId: payment.userId,
        planId: payment.planId!,
        paymentId: payment._id,
      });

      payment.status = "COMPLETED";
      payment.subscriptionId = activation.subscription._id;
      await payment.save();

      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        message: "Simulated payment verified. Membership activated!",
        activation,
      });
    }

    // Call official Chapa verification API server-to-server
    const chapaRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${chapaSecret}`,
      },
    });

    const chapaData = await chapaRes.json();
    if (!chapaRes.ok || chapaData.status !== "success" || chapaData.data?.status !== "success") {
      return NextResponse.json({
        success: false,
        status: chapaData?.data?.status || "FAILED",
        message: chapaData?.message || "Payment verification failed on Chapa gateway.",
      });
    }

    // Verify amount matches
    const paidAmount = Number(chapaData.data.amount);
    if (paidAmount < payment.amountETB) {
      payment.status = "FAILED";
      await payment.save();
      return NextResponse.json({ success: false, message: "Paid amount is less than plan price." }, { status: 400 });
    }

    // Idempotent membership activation
    const activation = await activateMembership({
      userId: payment.userId,
      planId: payment.planId!,
      paymentId: payment._id,
    });

    payment.status = "COMPLETED";
    payment.subscriptionId = activation.subscription._id;
    payment.chapaReference = chapaData.data.reference;
    await payment.save();

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      message: "Payment successfully verified! Your membership is active.",
      activation,
    });
  } catch (error: any) {
    console.error("[CHAPA_VERIFY_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Verification failed." }, { status: 500 });
  }
}
