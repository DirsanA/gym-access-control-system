import { allMembers, createMember } from "@/lib/mock-gym-data";

export const dynamic = "force-dynamic";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function GET() {
  return Response.json({ success: true, members: allMembers() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ success: false, message: "Please provide member details." }, { status: 400 });
  const fullName = text(body.fullName), phone = text(body.phone), membershipPlan = text(body.membershipPlan);
  const membershipStartDate = text(body.membershipStartDate), membershipEndDate = text(body.membershipEndDate);
  if (fullName.length < 2 || phone.length < 5 || membershipPlan.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(membershipStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(membershipEndDate) || membershipEndDate < membershipStartDate) {
    return Response.json({ success: false, message: "Please complete the required fields and use valid membership dates." }, { status: 400 });
  }
  const member = createMember({
    fullName, phone, membershipPlan, membershipStartDate, membershipEndDate,
    email: text(body.email) || undefined, gender: text(body.gender) || undefined,
    dateOfBirth: text(body.dateOfBirth) || undefined, profileImage: text(body.profileImage) || null,
    isActive: true,
  });
  return Response.json({ success: true, member }, { status: 201 });
}
