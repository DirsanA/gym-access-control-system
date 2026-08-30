import type { AccessResponse } from "@/types/scanner";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function readResponse(response: Response): Promise<AccessResponse> {
  const body = (await response.json().catch(() => null)) as AccessResponse | null;
  if (!body) {
    throw new Error("The access server returned an invalid response.");
  }
  return body;
}

export async function verifyMember(memberId: string): Promise<AccessResponse> {
  const response = await fetch(`${apiUrl}/api/scanner/${encodeURIComponent(memberId)}`, {
    cache: "no-store",
  });
  return readResponse(response);
}

export async function recordCheckIn(memberId: string): Promise<AccessResponse> {
  const response = await fetch(`${apiUrl}/api/check-ins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  });
  return readResponse(response);
}
