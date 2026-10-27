import { connectDB } from "@/lib/db/mongodb";
import { Otp, User } from "@/lib/models";
import { generateOTP, hashString } from "@/lib/auth/session";
import { sendOtpEmail } from "@/lib/email/brevo";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { username, email, phone, password, fullName, gender } = body;

    // Server-side validation
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 9) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid phone number (e.g., +251 91 123 4567)." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Check for existing users
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: "This username is already taken." },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create unverified customer
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      phone: phone.trim(),
      fullName: fullName?.trim() || username.trim(),
      gender: gender && ["MALE", "FEMALE", "OTHER"].includes(gender) ? gender : undefined,
      passwordHash,
      role: "customer",
      isVerified: false,
      isSuspended: false,
    });

    // Generate cryptographic OTP
    const otp = generateOTP(6);
    const otpHash = hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 1 minute cooldown

    // Save hashed OTP
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
    });

    // Send email via Brevo SMTP
    await sendOtpEmail(normalizedEmail, otp, user.username);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. Please enter the verification code sent to your email.",
        email: normalizedEmail,
        userId: user._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to register user." },
      { status: 500 }
    );
  }
}
