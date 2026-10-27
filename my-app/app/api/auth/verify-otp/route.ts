import { connectDB } from "@/lib/db/mongodb";
import { Otp, User } from "@/lib/models";
import { COOKIE_NAME, hashString, signToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP code are required." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Check OTP record
    const otpRecord = await Otp.findOne({ email: normalizedEmail });
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "Verification code has expired or was not requested." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: "Verification code has expired. Please re-register." },
        { status: 400 }
      );
    }

    // Check max attempts (limit 5 attempts)
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: "Too many failed attempts. Please submit the registration form again." },
        { status: 429 }
      );
    }

    // Verify hash
    const inputHash = hashString(cleanOtp);
    if (inputHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json(
        {
          success: false,
          message: `Incorrect code. ${5 - otpRecord.attempts} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    // OTP IS VALID!
    // Now create the verified User in the User collection
    let user = await User.findOne({ email: normalizedEmail });

    if (!user && otpRecord.registrationData) {
      const reg = otpRecord.registrationData;
      user = await User.create({
        username: reg.username,
        email: normalizedEmail,
        phone: reg.phone,
        fullName: reg.fullName,
        gender: reg.gender,
        passwordHash: reg.passwordHash,
        role: "customer",
        isVerified: true,
        isSuspended: false,
      });
    } else if (user) {
      user.isVerified = true;
      await user.save();
    } else {
      return NextResponse.json(
        { success: false, message: "Registration session not found. Please register again." },
        { status: 400 }
      );
    }

    // Delete used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Issue HTTP-only JWT session cookie
    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      memberId: user.memberId,
      isVerified: user.isVerified,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Account verified and registered successfully! Welcome to Elite Fitness.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        memberId: user.memberId,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error("[VERIFY_OTP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
