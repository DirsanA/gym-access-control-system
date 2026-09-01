import { renewMember } from "@/lib/mock-gym-data";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const body = await request.json().catch(() => null) as { days?: unknown } | null;
  const days = typeof body?.days === "number" ? body.days : Number(body?.days);
  if (!Number.isInteger(days) || days < 1 || days > 730) {
    return Response.json({ success: false, message: "Enter renewal days between 1 and 730." }, { status: 400 });
  }
  const { memberId } = await params;
  const member = renewMember(decodeURIComponent(memberId), days);
  if (!member) return Response.json({ success: false, message: "Member not found." }, { status: 404 });
  return Response.json({ success: true, member });
}
