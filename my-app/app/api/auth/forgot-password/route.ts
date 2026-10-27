import { connectDB } from "@/lib/db/mongodb";
import { generateOTP, hashOTP } from "@/lib/auth/session";
import { sendPasswordResetOtpEmail } from "@/lib/email/brevo";
import { Otp, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak registered accounts, but provide clear guidance
      return NextResponse.json(
        {
          success: false,
          message: "No account found registered with this email address. Please check your spelling or register.",
        },
        { status: 404 }
      );
    }

    // Check resend rate-limit (60s cooldown)
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp && existingOtp.resendAvailableAt > new Date()) {
      const waitSec = Math.ceil((existingOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${waitSec} seconds before requesting a new password reset code.`,
          retryAfter: waitSec,
        },
        { status: 429 }
      );
    }

    // Generate fresh 6-digit OTP
    const rawOtp = generateOTP(6);
    const otpHash = hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s cooldown

    await Otp.findOneAndUpdate(
      { email },
      {
        email,
        otpHash,
        attempts: 0,
        expiresAt,
        resendAvailableAt,
        registrationData: { purpose: "password_reset", userId: user._id.toString() },
      },
      { upsert: true, new: true }
    );

    // Send email dispatch
    const emailResult = await sendPasswordResetOtpEmail(
      email,
      rawOtp,
      user.fullName || user.username || "Athlete"
    );

    if (!emailResult.success && !emailResult.error?.includes("missing")) {
      return NextResponse.json(
        { success: false, message: "Failed to dispatch reset code email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "A 6-digit password reset verification code has been dispatched to your email.",
      email,
    });
  } catch (error: any) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
