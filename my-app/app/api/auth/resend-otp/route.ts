import { connectDB } from "@/lib/db/mongodb";
import { Otp, User } from "@/lib/models";
import { generateOTP, hashString } from "@/lib/auth/session";
import { sendOtpEmail } from "@/lib/email/brevo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("\n==================== [AUTH RESEND OTP REQUEST START] ====================");
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim().toLowerCase();

    console.log("[RESEND_OTP] Request for email:", email);

    if (!email) {
      console.warn("[RESEND_OTP] Email missing from request body.");
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    console.log("[RESEND_OTP] Connecting to database...");
    await connectDB();

    // Check if user is already verified
    const verifiedUser = await User.findOne({ email, isVerified: true });
    if (verifiedUser) {
      console.warn(`[RESEND_OTP] User ${email} is already verified.`);
      return NextResponse.json(
        { success: false, message: "Account is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Find pending OTP session
    const existingOtp = await Otp.findOne({ email });
    if (!existingOtp) {
      console.warn(`[RESEND_OTP] No pending registration found for ${email}.`);
      return NextResponse.json(
        { success: false, message: "No active registration found. Please submit the registration form." },
        { status: 404 }
      );
    }

    // Check rate limit on resending (must wait at least 60 seconds)
    if (new Date() < existingOtp.resendAvailableAt) {
      const waitSeconds = Math.ceil((existingOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
      console.warn(`[RESEND_OTP] Rate limit hit for ${email}. Cooldown remaining: ${waitSeconds}s`);
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${waitSeconds}s before requesting another verification code.`,
        },
        { status: 429 }
      );
    }

    // Generate new OTP while preserving pending registrationData
    const otp = generateOTP(6);
    const otpHash = hashString(otp);
    existingOtp.otpHash = otpHash;
    existingOtp.attempts = 0;
    existingOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    existingOtp.resendAvailableAt = new Date(Date.now() + 60 * 1000);
    await existingOtp.save();

    console.log(`[RESEND_OTP] New OTP generated: [${otp}] for email: ${email}`);

    const username = existingOtp.registrationData?.username || "Athlete";
    console.log(`[RESEND_OTP] Dispatching email to ${email} via Brevo...`);
    const emailResult = await sendOtpEmail(email, otp, username);
    console.log("[RESEND_OTP] Email dispatch outcome:", emailResult);

    console.log("==================== [AUTH RESEND OTP REQUEST END: SUCCESS] ====================\n");
    return NextResponse.json({
      success: true,
      message: "A new verification code has been dispatched to your email address.",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error: any) {
    console.error("[RESEND_OTP_ERROR] Uncaught exception:", error);
    console.log("==================== [AUTH RESEND OTP REQUEST END: ERROR] ====================\n");
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to resend verification code." },
      { status: 500 }
    );
  }
}
