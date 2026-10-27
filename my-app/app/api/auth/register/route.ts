import { connectDB } from "@/lib/db/mongodb";
import { Otp, User } from "@/lib/models";
import { generateOTP, hashString } from "@/lib/auth/session";
import { sendOtpEmail } from "@/lib/email/brevo";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("\n==================== [AUTH REGISTER REQUEST START] ====================");
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      console.warn("[REGISTER] Received empty or invalid JSON body.");
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { username, email, phone, password, fullName, gender } = body;
    console.log("[REGISTER] Processing registration for:", {
      username,
      email,
      phone,
      fullName: fullName || username,
      gender,
    });

    // Server-side validation
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      console.warn("[REGISTER VALIDATION FAILED] Username too short:", username);
      return NextResponse.json(
        { success: false, message: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn("[REGISTER VALIDATION FAILED] Invalid email format:", email);
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 9) {
      console.warn("[REGISTER VALIDATION FAILED] Invalid phone:", phone);
      return NextResponse.json(
        { success: false, message: "Please provide a valid phone number (e.g., +251 91 123 4567)." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      console.warn("[REGISTER VALIDATION FAILED] Password too short.");
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    console.log("[REGISTER] Step 1: Connecting to MongoDB...");
    await connectDB();
    console.log("[REGISTER] Step 1: Connected to MongoDB successfully.");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Check if an already VERIFIED user exists with this email or username
    console.log(`[REGISTER] Step 2: Checking existing verified users for email: ${normalizedEmail}`);
    const verifiedUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      isVerified: true,
    });

    if (verifiedUser) {
      if (verifiedUser.email === normalizedEmail) {
        console.warn(`[REGISTER CONFLICT] Email ${normalizedEmail} is already registered & verified.`);
        return NextResponse.json(
          { success: false, message: "An account with this email is already registered and verified. Please sign in." },
          { status: 409 }
        );
      }
      console.warn(`[REGISTER CONFLICT] Username ${normalizedUsername} is already taken.`);
      return NextResponse.json(
        { success: false, message: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Clean up any stale unverified user record with this email or username
    await User.deleteMany({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      isVerified: false,
    });

    // Hash password
    console.log("[REGISTER] Step 3: Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate cryptographic OTP
    const otp = generateOTP(6);
    const otpHash = hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 1 minute cooldown

    console.log(`[REGISTER] Step 4: Generated OTP code: [${otp}] (expires in 10 minutes)`);

    // Save pending registration inside OTP document (User is NOT created in User collection yet!)
    console.log("[REGISTER] Step 5: Storing pending registration in Otp collection...");
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      registrationData: {
        username: normalizedUsername,
        email: normalizedEmail,
        phone: phone.trim(),
        fullName: fullName?.trim() || username.trim(),
        gender: gender && ["MALE", "FEMALE", "OTHER"].includes(gender) ? gender : undefined,
        passwordHash,
      },
    });
    console.log("[REGISTER] Step 5: Pending registration saved in database.");

    // Send email via Brevo SMTP
    console.log(`[REGISTER] Step 6: Dispatching OTP email to ${normalizedEmail} via Brevo...`);
    const emailResult = await sendOtpEmail(normalizedEmail, otp, username.trim());
    console.log("[REGISTER] Step 6: Email dispatch outcome:", emailResult);

    console.log("==================== [AUTH REGISTER REQUEST END: SUCCESS] ====================\n");
    return NextResponse.json(
      {
        success: true,
        message: "Registration received! Please enter the 6-digit verification code sent to your email.",
        email: normalizedEmail,
        // In local development, also include OTP in response for debugging ease
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER_ERROR] Uncaught exception during registration:", error);
    console.log("==================== [AUTH REGISTER REQUEST END: ERROR] ====================\n");
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to register user." },
      { status: 500 }
    );
  }
}
