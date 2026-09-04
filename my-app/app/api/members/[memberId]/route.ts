import { deleteMember } from "@/lib/mock-gym-data";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const removed = deleteMember(decodeURIComponent(memberId));
  if (!removed) return Response.json({ success: false, message: "Member not found." }, { status: 404 });
  return Response.json({ success: true, message: "Member deleted." });
}
