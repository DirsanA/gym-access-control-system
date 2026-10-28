import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { uploadMemberPhotoToCloudinary } from "@/lib/cloudinary";
import { Payment, Plan, Subscription, Ticket, User } from "@/lib/models";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const today = new Date();

    // Active subscription
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: "ACTIVE",
      endDate: { $gte: today },
    }).sort({ endDate: -1 });

    // Historical subscriptions
    const allSubscriptions = await Subscription.find({ userId: user._id }).sort({ createdAt: -1 });

    // Digital ticket
    const ticket = await Ticket.findOne({
      userId: user._id,
      isRevoked: false,
    }).sort({ createdAt: -1 });

    // Payment history
    const payments = await Payment.find({ userId: user._id }).sort({ createdAt: -1 });

    // Available plans
    const availablePlans = await Plan.find({ isActive: true }).sort({ priceETB: 1 });

    const memberPassData =
      user.memberId && activeSubscription
        ? {
            memberId: user.memberId,
            fullName: user.fullName || user.username,
            membershipPlan: activeSubscription.planName,
            membershipStartDate: activeSubscription.startDate.toISOString().slice(0, 10),
            membershipEndDate: activeSubscription.endDate.toISOString().slice(0, 10),
            profileImage: user.photoUrl || null,
            ticketToken: ticket?.ticketToken,
            qrPayload: ticket?.qrPayload || ticket?.ticketToken || user.memberId,
          }
        : null;

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          gender: user.gender,
          role: user.role,
          memberId: user.memberId,
          photoUrl: user.photoUrl || null,
          isVerified: user.isVerified,
          isSuspended: user.isSuspended,
        },
        hasActiveMembership: !!activeSubscription,
        activeSubscription,
        memberPassData,
        allSubscriptions,
        payments,
        availablePlans,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("[PROFILE_DATA_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { fullName, phone, gender, photoUrl } = body || {};

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const updateFields: Record<string, any> = {};

    if (typeof fullName === "string" && fullName.trim()) {
      user.fullName = fullName.trim();
      updateFields.fullName = fullName.trim();
    }
    if (typeof phone === "string" && phone.trim()) {
      user.phone = phone.trim();
      updateFields.phone = phone.trim();
    }
    if (gender && ["MALE", "FEMALE", "OTHER"].includes(gender)) {
      user.gender = gender;
      updateFields.gender = gender;
    }
    
    if (typeof photoUrl === "string" && photoUrl.trim()) {
      let finalUrl = photoUrl.trim();
      // If photo is a base64 data URI from selfie camera or file picker, upload to Cloudinary
      if (finalUrl.startsWith("data:image/")) {
        const uploadResult = await uploadMemberPhotoToCloudinary(
          finalUrl,
          user.memberId || user.username || user._id.toString()
        );
        if (uploadResult.success && uploadResult.url) {
          finalUrl = uploadResult.url;
        }
      }
      user.photoUrl = finalUrl;
      updateFields.photoUrl = finalUrl;
    }

    // Direct atomic persistence to MongoDB
    if (Object.keys(updateFields).length > 0) {
      await User.findByIdAndUpdate(user._id, { $set: updateFields });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          gender: user.gender,
          memberId: user.memberId,
          photoUrl: user.photoUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update profile." }, { status: 500 });
  }
}
