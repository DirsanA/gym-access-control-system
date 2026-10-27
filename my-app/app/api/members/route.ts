import { connectDB } from "@/lib/db/mongodb";
import { generateNextMemberId } from "@/lib/memberships/activate";
import { Plan, Subscription, User } from "@/lib/models";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({ role: "customer" }).sort({ createdAt: -1 });

    const today = new Date();

    // Map each customer with active subscription details
    const members = await Promise.all(
      users.map(async (u) => {
        const sub = await Subscription.findOne({ userId: u._id, status: "ACTIVE" }).sort({ endDate: -1 });
        const isActive = !u.isSuspended && !!sub && sub.endDate >= today;

        return {
          memberId: u.memberId || `GYM-${u._id.toString().slice(-6).toUpperCase()}`,
          fullName: u.fullName || u.username,
          phone: u.phone,
          email: u.email,
          gender: u.gender || "OTHER",
          membershipPlan: sub?.planName || "No Active Plan",
          membershipStartDate: sub ? sub.startDate.toISOString().slice(0, 10) : u.createdAt.toISOString().slice(0, 10),
          membershipEndDate: sub ? sub.endDate.toISOString().slice(0, 10) : u.createdAt.toISOString().slice(0, 10),
          profileImage: null,
          isActive,
          createdAt: u.createdAt.toISOString(),
          isVerified: u.isVerified,
          isSuspended: u.isSuspended,
          userId: u._id.toString(),
        };
      })
    );

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error("[MEMBERS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to load members." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { fullName, phone, gender, membershipStartDate, membershipEndDate, membershipPlan } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ success: false, message: "Full name and phone number are required." }, { status: 400 });
    }

    await connectDB();

    // Clean username & email for manual admin enrollment
    const username = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 1000);
    const email = `${username}@elitefitness.local`;
    const memberId = await generateNextMemberId();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("ElitePass2026!", salt);

    const user = await User.create({
      username,
      email,
      phone: phone.trim(),
      fullName: fullName.trim(),
      gender: gender && ["MALE", "FEMALE", "OTHER"].includes(gender) ? gender : undefined,
      passwordHash,
      role: "customer",
      isVerified: true, // Manual admin registrations are pre-verified
      isSuspended: false,
      memberId,
    });

    // Check or find Plan
    let plan = await Plan.findOne({ name: membershipPlan });
    if (!plan) {
      plan = await Plan.findOne({ isActive: true }) || await Plan.create({
        name: membershipPlan || "Standard Membership",
        slug: "standard-membership",
        description: "Enrolled by management",
        priceETB: 2500,
        durationMonths: 1,
        durationDays: 30,
        isActive: true,
      });
    }

    const startDate = membershipStartDate ? new Date(membershipStartDate) : new Date();
    const endDate = membershipEndDate ? new Date(membershipEndDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await Subscription.create({
      userId: user._id,
      planId: plan._id,
      planName: plan.name,
      startDate,
      endDate,
      status: "ACTIVE",
    });

    const member = {
      memberId: user.memberId,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      membershipPlan: plan.name,
      membershipStartDate: startDate.toISOString().slice(0, 10),
      membershipEndDate: endDate.toISOString().slice(0, 10),
      profileImage: null,
      isActive: true,
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    console.error("[MEMBERS_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to register member." }, { status: 500 });
  }
}
