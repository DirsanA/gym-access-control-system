export type ScannerState =
  | "READY"
  | "SCANNING"
  | "CHECKING"
  | "ACCESS_GRANTED"
  | "MEMBERSHIP_EXPIRED"
  | "MEMBER_NOT_FOUND"
  | "ERROR";

export type AccessStatus = "ACTIVE" | "EXPIRED" | "NOT_FOUND";

export type ScannerMember = {
  memberId: string;
  fullName: string;
  profileImage: string | null;
  membershipPlan: string;
  membershipStartDate: string;
  membershipEndDate: string;
};

export type AccessResponse = {
  success: boolean;
  status: AccessStatus | "ERROR";
  message: string;
  member?: ScannerMember;
  duplicate?: boolean;
  checkIn?: {
    id: string;
    scannedAt: string;
    result: "SUCCESS" | "EXPIRED" | "NOT_FOUND";
  };
};
