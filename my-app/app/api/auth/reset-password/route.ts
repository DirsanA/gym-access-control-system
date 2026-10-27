import { connectDB } from "@/lib/db/mongodb";
import { hashOTP } from "@/lib/auth/session";
import { Otp, User } from "@/lib/models";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { success: false, message: "Please provide the complete 6-digit verification code." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectDB();

    const otpDoc = await Otp.findOne({ email });
    if (!otpDoc) {
      return NextResponse.json(
        { success: false, message: "Reset code has expired or was not requested. Please request a new code." },
        { status: 400 }
      );
    }

    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      return NextResponse.json(
        { success: false, message: "The verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ email });
      return NextResponse.json(
        { success: false, message: "Too many failed attempts. Please request a new verification code." },
        { status: 429 }
      );
    }

    const hashedInputOtp = hashOTP(otp);
    if (hashedInputOtp !== otpDoc.otpHash) {
      otpDoc.attempts = (otpDoc.attempts || 0) + 1;
      await otpDoc.save();
      const remaining = 5 - otpDoc.attempts;
      return NextResponse.json(
        {
          success: false,
          message: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : "Please request a new code."}`,
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found associated with this email address." },
        { status: 404 }
      );
    }

    // Generate fresh salt and update password hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    await user.save();

    // Invalidate the OTP now that password has been reset
    await Otp.deleteOne({ email });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You can now sign in with your new credentials.",
    });
  } catch (error: any) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
