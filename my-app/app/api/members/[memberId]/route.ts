import { connectDB } from "@/lib/db/mongodb";
import { Payment, ScanLog, Subscription, Ticket, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params;
    const cleanId = decodeURIComponent(memberId).trim().toUpperCase();

    await connectDB();
    const user = await User.findOne({ memberId: cleanId });
    if (!user) {
      return NextResponse.json({ success: false, message: "Member not found." }, { status: 404 });
    }

    const today = new Date();
    const sub = await Subscription.findOne({ userId: user._id, status: "ACTIVE" }).sort({ endDate: -1 });

    const member = {
      memberId: user.memberId,
      fullName: user.fullName || user.username,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      membershipPlan: sub?.planName || "No Active Plan",
      membershipStartDate: sub ? sub.startDate.toISOString().slice(0, 10) : user.createdAt.toISOString().slice(0, 10),
      membershipEndDate: sub ? sub.endDate.toISOString().slice(0, 10) : user.createdAt.toISOString().slice(0, 10),
      profileImage: null,
      isActive: !user.isSuspended && !!sub && sub.endDate >= today,
      createdAt: user.createdAt.toISOString(),
      isVerified: user.isVerified,
      isSuspended: user.isSuspended,
    };

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Failed to load member." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params;
    const cleanId = decodeURIComponent(memberId).trim().toUpperCase();

    await connectDB();
    const user = await User.findOne({ memberId: cleanId });
    if (!user) {
      return NextResponse.json({ success: false, message: "Member not found." }, { status: 404 });
    }

    // Clean up user and associated records
    await Subscription.deleteMany({ userId: user._id });
    await Ticket.deleteMany({ userId: user._id });
    await Payment.deleteMany({ userId: user._id });
    await ScanLog.deleteMany({ memberId: cleanId });
    await User.deleteOne({ _id: user._id });

    return NextResponse.json({ success: true, message: `Member ${cleanId} deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Failed to delete member." }, { status: 500 });
  }
}
