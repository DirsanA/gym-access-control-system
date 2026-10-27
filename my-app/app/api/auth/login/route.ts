import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/lib/models";
import { COOKIE_NAME, signToken } from "@/lib/auth/session";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { identifier, password } = body;
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both username/email and password." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalized = identifier.trim().toLowerCase();

    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: normalized }, { username: normalized }],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Check account status
    if (user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account has been suspended by management. Please contact the front desk.",
        },
        { status: 403 }
      );
    }

    // Check email verification
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          email: user.email,
          message: "Please verify your email address to access your account.",
        },
        { status: 403 }
      );
    }

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
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Sign in successful.",
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
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to log in." },
      { status: 500 }
    );
  }
}
