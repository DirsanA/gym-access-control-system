import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { Payment, Plan, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Please sign in to proceed with checkout." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const planId = body?.planId;
    if (!planId) {
      return NextResponse.json({ success: false, message: "Plan ID is required." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found." }, { status: 404 });
    }

    if (!user.isVerified) {
      return NextResponse.json({ success: false, message: "Please verify your email before purchasing a plan." }, { status: 403 });
    }

    if (user.role !== "admin" && !user.photoUrl) {
      return NextResponse.json(
        {
          success: false,
          photoRequired: true,
          message: "A clear portrait photo ID is required before purchasing a membership pass. Entrance attendants and optical gate turnstiles visually verify your face upon entry.",
        },
        { status: 400 }
      );
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ success: false, message: "Selected membership plan is currently unavailable." }, { status: 404 });
    }

    const txRef = `TX-ELITE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const chapaSecret = process.env.CHAPA_SECRET_KEY || "";

    // Record pending payment in database first
    const payment = await Payment.create({
      userId: user._id,
      planId: plan._id,
      amountETB: plan.priceETB,
      currency: "ETB",
      provider: "CHAPA",
      status: "PENDING",
      txRef,
      metadata: {
        planName: plan.name,
        customerUsername: user.username,
      },
    });

    // Check if test/placeholder mode without real Chapa keys
    if (!chapaSecret || chapaSecret.includes("placeholder")) {
      // In local dev without live Chapa keys, provide instant simulated test checkout URL
      const mockCheckoutUrl = `${appUrl}/profile/payment-result?tx_ref=${txRef}&status=success`;
      payment.chapaCheckoutUrl = mockCheckoutUrl;
      await payment.save();

      return NextResponse.json({
        success: true,
        checkoutUrl: mockCheckoutUrl,
        txRef,
        isSimulated: true,
      });
    }

    // Call live Chapa API
    const chapaPayload = {
      amount: plan.priceETB.toString(),
      currency: "ETB",
      email: user.email,
      first_name: user.fullName?.split(" ")[0] || user.username,
      last_name: user.fullName?.split(" ").slice(1).join(" ") || "Member",
      phone_number: user.phone,
      tx_ref: txRef,
      callback_url: `${appUrl}/api/payments/chapa/webhook`,
      return_url: `${appUrl}/profile/payment-result?tx_ref=${txRef}`,
      "customization[title]": "Elite Fitness Membership",
      "customization[description]": plan.name,
    };

    const chapaRes = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chapaSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chapaPayload),
    });

    const chapaData = await chapaRes.json();
    if (!chapaRes.ok || chapaData.status !== "success" || !chapaData.data?.checkout_url) {
      payment.status = "FAILED";
      await payment.save();
      return NextResponse.json(
        { success: false, message: chapaData?.message || "Failed to initialize payment with Chapa." },
        { status: 502 }
      );
    }

    payment.chapaCheckoutUrl = chapaData.data.checkout_url;
    await payment.save();

    return NextResponse.json({
      success: true,
      checkoutUrl: chapaData.data.checkout_url,
      txRef,
    });
  } catch (error: any) {
    console.error("[CHAPA_INIT_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to initialize checkout." },
      { status: 500 }
    );
  }
}
