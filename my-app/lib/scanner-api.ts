import type { AccessResponse, ScannerMember } from "@/types/scanner";

function localMemberAccess(memberId: string): AccessResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`gym-mock-member:${memberId}`);
  if (!raw) return null;
  try {
    const member = JSON.parse(raw) as ScannerMember & { isActive?: boolean };
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
    if (!member.isActive || member.membershipEndDate < today) {
      return { success: false, status: "EXPIRED", message: "This membership has expired.", member };
    }
    return { success: true, status: "ACTIVE", message: "Membership is active. Welcome in!", member };
  } catch {
    return null;
  }
}

async function readResponse(response: Response): Promise<AccessResponse> {
  const body = (await response.json().catch(() => null)) as AccessResponse | null;
  if (!body) {
    throw new Error("The access server returned an invalid response.");
  }
  return body;
}

export async function verifyMember(memberId: string): Promise<AccessResponse> {
  try {
    const response = await fetch(`/api/scanner/${encodeURIComponent(memberId)}`, {
      cache: "no-store",
    });
    return await readResponse(response);
  } catch (err) {
    const local = localMemberAccess(memberId);
    if (local) return local;
    throw err;
  }
}

export async function recordCheckIn(memberId: string): Promise<AccessResponse> {
  try {
    const response = await fetch(`/api/check-ins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    return await readResponse(response);
  } catch (err) {
    const local = localMemberAccess(memberId);
    if (local) {
      return {
        ...local,
        checkIn: { id: crypto.randomUUID(), scannedAt: new Date().toISOString(), result: local.status === "ACTIVE" ? "SUCCESS" : "EXPIRED" },
      };
    }
    throw err;
  }
}
