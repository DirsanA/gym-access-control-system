import { connectDB } from "@/lib/db/mongodb";
import { generateNextMemberId } from "@/lib/memberships/activate";
import { Plan, Subscription, User } from "@/lib/models";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || searchParams.get("query")?.trim() || "";
    const filterStatus = (searchParams.get("status") || "ALL").toUpperCase(); // ALL, ACTIVE, EXPIRED
    const all = searchParams.get("all") === "true"; // Backward compatibility fallback

    const today = new Date();

    // Fast indexed match on customer accounts
    const userMatch: any = { role: "customer" };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      userMatch.$or = [
        { fullName: regex },
        { memberId: regex },
        { phone: regex },
        { email: regex },
        { username: regex },
      ];
    }

    // High performance aggregation pipeline that eliminates N+1 queries
    const pipeline: any[] = [
      { $match: userMatch },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "subscriptions",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$uid"] },
                    { $eq: ["$status", "ACTIVE"] },
                  ],
                },
              },
            },
            { $sort: { endDate: -1 } },
            { $limit: 1 },
          ],
          as: "activeSubscription",
        },
      },
      {
        $addFields: {
          sub: { $arrayElemAt: ["$activeSubscription", 0] },
        },
      },
      {
        $addFields: {
          computedIsActive: {
            $and: [
              { $eq: ["$isSuspended", false] },
              { $gt: ["$sub", null] },
              { $gte: ["$sub.endDate", today] },
            ],
          },
        },
      },
    ];

    if (filterStatus === "ACTIVE") {
      pipeline.push({ $match: { computedIsActive: true } });
    } else if (filterStatus === "EXPIRED") {
      pipeline.push({ $match: { computedIsActive: false } });
    }

    const facetStage: any = {
      metadata: [{ $count: "total" }],
    };

    if (all) {
      facetStage.data = [];
    } else {
      facetStage.data = [
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
    }

    pipeline.push({ $facet: facetStage });

    // Execute aggregation and global counts in parallel
    const [result, totalCustomers, totalActive] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments({ role: "customer" }),
      Subscription.countDocuments({ status: "ACTIVE", endDate: { $gte: today } }),
    ]);

    const rawItems = result[0]?.data || [];
    const totalFiltered = result[0]?.metadata[0]?.total || 0;
    const totalExpired = Math.max(0, totalCustomers - totalActive);

    const members = rawItems.map((u: any) => {
      const sub = u.sub;
      const isActive = Boolean(u.computedIsActive);

      return {
        memberId: u.memberId || `GYM-${u._id.toString().slice(-6).toUpperCase()}`,
        fullName: u.fullName || u.username,
        phone: u.phone,
        email: u.email,
        gender: u.gender || "OTHER",
        membershipPlan: sub?.planName || "No Active Plan",
        membershipStartDate: sub ? new Date(sub.startDate).toISOString().slice(0, 10) : new Date(u.createdAt).toISOString().slice(0, 10),
        membershipEndDate: sub ? new Date(sub.endDate).toISOString().slice(0, 10) : new Date(u.createdAt).toISOString().slice(0, 10),
        profileImage: u.photoUrl || null,
        isActive,
        createdAt: new Date(u.createdAt).toISOString(),
        isVerified: Boolean(u.isVerified),
        isSuspended: Boolean(u.isSuspended),
        userId: u._id.toString(),
      };
    });

    const totalPages = all ? 1 : Math.max(1, Math.ceil(totalFiltered / limit));

    return NextResponse.json({
      success: true,
      members,
      pagination: {
        page: all ? 1 : page,
        limit: all ? totalFiltered : limit,
        total: totalFiltered,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      counts: {
        total: totalCustomers,
        active: totalActive,
        expired: totalExpired,
      },
    });
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
