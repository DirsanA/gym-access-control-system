import { connectDB } from "@/lib/db/mongodb";
import { Plan } from "@/lib/models";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const plans = await Plan.find({ isActive: true }).sort({ priceETB: 1 });
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load membership plans." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { name, description, priceETB, durationMonths, durationDays, features } = body;
    if (!name || !priceETB) {
      return NextResponse.json({ success: false, message: "Plan name and price are required." }, { status: 400 });
    }

    await connectDB();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const plan = await Plan.create({
      name,
      slug,
      description: description || "",
      priceETB: Number(priceETB),
      durationMonths: Number(durationMonths) || 1,
      durationDays: Number(durationDays) || (Number(durationMonths) ? Number(durationMonths) * 30 : 30),
      features: Array.isArray(features) ? features : [],
      isActive: true,
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Failed to create plan." }, { status: 500 });
  }
}
