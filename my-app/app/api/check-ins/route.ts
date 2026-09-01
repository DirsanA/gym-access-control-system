import { accessFor } from "@/lib/mock-gym-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { memberId?: unknown } | null;
  const memberId = typeof body?.memberId === "string" ? body.memberId.trim().toUpperCase() : "";
  if (!/^GYM-\d{6,}$/.test(memberId)) return Response.json({ success: false, status: "ERROR", message: "Enter a valid member ID." }, { status: 400 });
  const access = accessFor(memberId);
  return Response.json({ ...access, checkIn: { id: crypto.randomUUID(), scannedAt: new Date().toISOString(), result: access.status === "ACTIVE" ? "SUCCESS" : access.status } }, { status: access.status === "NOT_FOUND" ? 404 : 200 });
}
