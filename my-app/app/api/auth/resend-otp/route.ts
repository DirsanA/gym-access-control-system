import { connectDB } from "@/lib/db/mongodb";
import { Otp, User } from "@/lib/models";
import { generateOTP, hashString } from "@/lib/auth/session";
import { sendOtpEmail } from "@/lib/email/brevo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Account is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Check rate limit on resending (must wait at least 60 seconds)
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp && new Date() < existingOtp.resendAvailableAt) {
      const waitSeconds = Math.ceil((existingOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${waitSeconds}s before requesting another verification code.`,
        },
        { status: 429 }
      );
    }

    // Generate new OTP
    const otp = generateOTP(6);
    const otpHash = hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    await Otp.deleteMany({ email });
    await Otp.create({
      email,
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
    });

    await sendOtpEmail(email, otp, user.username);

    return NextResponse.json({
      success: true,
      message: "A new verification code has been dispatched to your email address.",
    });
  } catch (error: any) {
    console.error("[RESEND_OTP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to resend verification code." },
      { status: 500 }
    );
  }
}
