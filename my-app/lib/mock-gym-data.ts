import type { AccessResponse, ScannerMember } from "@/types/scanner";

export type GymMember = ScannerMember & {
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  isActive: boolean;
  createdAt: string;
};

type NewMember = Omit<GymMember, "memberId" | "createdAt">;

// This is deliberately in-memory mock data. It makes the Next.js demo work
// without MongoDB, and resets when a Vercel serverless function is restarted.
const members: GymMember[] = [
  {
    memberId: "GYM-000123", fullName: "Amina Wanjiku", phone: "+254 712 345 678",
    email: "amina@example.com", gender: "FEMALE", membershipPlan: "Premium Annual",
    membershipStartDate: "2026-01-01", membershipEndDate: "2027-01-01", profileImage: null,
    isActive: true, createdAt: "2026-01-01T08:00:00.000Z",
  },
  {
    memberId: "GYM-000124", fullName: "Brian Otieno", phone: "+254 722 987 654",
    email: "brian@example.com", gender: "MALE", membershipPlan: "Monthly",
    membershipStartDate: "2025-06-01", membershipEndDate: "2025-06-30", profileImage: null,
    isActive: true, createdAt: "2025-06-01T08:00:00.000Z",
  },
  {
    memberId: "GYM-000125", fullName: "Faith Njeri", phone: "+254 733 112 244",
    membershipPlan: "Student", membershipStartDate: "2026-08-01", membershipEndDate: "2026-12-31",
    profileImage: null, isActive: true, createdAt: "2026-08-01T08:00:00.000Z",
  },
];

// These indexes mirror the lookups the production database needs. The scanner
// uses member ID for an O(1) lookup instead of scanning every member record.
const membersById = new Map(members.map((member) => [member.memberId, member]));
const membersByPhone = new Map(members.map((member) => [member.phone, member]));

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

export function accessFor(memberId: string): AccessResponse {
  const member = membersById.get(memberId.toUpperCase());
  if (!member) return { success: false, status: "NOT_FOUND", message: "No member is registered with this ID." };
  if (!member.isActive || member.membershipEndDate < today()) {
    return { success: false, status: "EXPIRED", message: "This membership has expired.", member };
  }
  return { success: true, status: "ACTIVE", message: "Membership is active. Welcome in!", member };
}

export function createMember(input: NewMember): GymMember {
  const largestNumber = members.reduce((largest, member) => Math.max(largest, Number(member.memberId.slice(4)) || 0), 122);
  const member: GymMember = { ...input, memberId: `GYM-${String(largestNumber + 1).padStart(6, "0")}`, createdAt: new Date().toISOString() };
  members.unshift(member);
  membersById.set(member.memberId, member);
  membersByPhone.set(member.phone, member);
  return member;
}

export function allMembers(): GymMember[] {
  return members;
}

export function renewMember(memberId: string, days: number): GymMember | null {
  const member = membersById.get(memberId.toUpperCase());
  if (!member) return null;
  const todayKey = today();
  const baseKey = member.membershipEndDate >= todayKey ? member.membershipEndDate : todayKey;
  const base = new Date(`${baseKey}T00:00:00.000Z`);
  const renewalStart = member.membershipEndDate >= todayKey ? 1 : 0;
  base.setUTCDate(base.getUTCDate() + days - renewalStart);
  member.membershipEndDate = base.toISOString().slice(0, 10);
  member.isActive = true;
  return member;
}

export function deleteMember(memberId: string): boolean {
  const id = memberId.toUpperCase();
  const member = membersById.get(id);
  if (!member) return false;
  const index = members.findIndex((m) => m.memberId === id);
  if (index === -1) return false;
  members.splice(index, 1);
  membersById.delete(id);
  membersByPhone.delete(member.phone);
  return true;
}
