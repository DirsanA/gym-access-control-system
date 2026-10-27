import { connectDB } from "@/lib/db/mongodb";
import { Subscription, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params;
    const body = await request.json().catch(() => null);
    const days = Number(body?.days) || 30;

    await connectDB();
    const cleanId = decodeURIComponent(memberId).trim().toUpperCase();

    const user = await User.findOne({ memberId: cleanId });
    if (!user) {
      return NextResponse.json({ success: false, message: "Member not found." }, { status: 404 });
    }

    const today = new Date();
    let sub = await Subscription.findOne({ userId: user._id, status: "ACTIVE" }).sort({ endDate: -1 });

    let baseDate = new Date();
    if (sub && sub.endDate > today) {
      baseDate = new Date(sub.endDate);
    }

    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    if (sub) {
      sub.endDate = newEndDate;
      sub.status = "ACTIVE";
      await sub.save();
    } else {
      sub = await Subscription.create({
        userId: user._id,
        planName: `${days} Days Extended Pass`,
        startDate: today,
        endDate: newEndDate,
        status: "ACTIVE",
      });
    }

    user.isSuspended = false;
    await user.save();

    const member = {
      memberId: user.memberId,
      fullName: user.fullName || user.username,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      membershipPlan: sub.planName,
      membershipStartDate: sub.startDate.toISOString().slice(0, 10),
      membershipEndDate: sub.endDate.toISOString().slice(0, 10),
      profileImage: null,
      isActive: true,
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Failed to renew member." }, { status: 500 });
  }
}
