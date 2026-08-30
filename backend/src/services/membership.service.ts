import type { MemberDocument } from "../models/member.model";
import { dateKey, todayInTimeZone } from "../utils/date";

export type MembershipStatus = "ACTIVE" | "EXPIRED";

export function membershipStatus(member: MemberDocument, timeZone: string): MembershipStatus {
  if (!member.isActive) return "EXPIRED";

  // Both values are calendar-day strings. This keeps a membership active until
  // the end of its stated expiration day, independent of server UTC time.
  return dateKey(member.membershipEndDate) >= todayInTimeZone(timeZone)
    ? "ACTIVE"
    : "EXPIRED";
}
