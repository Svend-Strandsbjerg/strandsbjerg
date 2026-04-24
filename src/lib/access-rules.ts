export type AccessRole = "ADMIN" | "USER";
export type AccessApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AccessSubject = {
  id?: string | null;
  role?: AccessRole | null;
  approvalStatus?: AccessApprovalStatus | null;
  isDiscAdmin?: boolean | null;
};

export function isApproved(subject?: AccessSubject | null) {
  return Boolean(subject?.id && subject.approvalStatus === "APPROVED");
}

export function canAccessFamilyFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject));
}

export function canAccessInvestmentsFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject) && subject?.role === "ADMIN");
}

export function canAccessAdminFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject) && subject?.role === "ADMIN");
}

export function canAccessDiscAdminFromSubject(subject?: AccessSubject | null) {
  // Rule: general admins are considered superior for DISC admin cockpit access.
  // Dedicated DISC admins (isDiscAdmin=true) can also access the same cockpit.
  return Boolean(isApproved(subject) && (subject?.role === "ADMIN" || subject?.isDiscAdmin));
}
