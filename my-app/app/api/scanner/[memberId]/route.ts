import { accessFor } from "@/lib/mock-gym-data";

export const dynamic = "force-dynamic";

export function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  return params.then(({ memberId }) => {
    const id = decodeURIComponent(memberId).trim().toUpperCase();
    if (!/^GYM-\d{6,}$/.test(id)) return Response.json({ success: false, status: "ERROR", message: "Enter a valid member ID such as GYM-000123." }, { status: 400 });
    const access = accessFor(id);
    return Response.json(access, { status: access.status === "NOT_FOUND" ? 404 : 200 });
  });
}
