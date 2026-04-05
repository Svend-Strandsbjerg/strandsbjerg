export type AccessRole = "ADMIN" | "FAMILY" | "USER";
export type AccessApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AccessSubject = {
  id?: string | null;
  role?: AccessRole | null;
  approvalStatus?: AccessApprovalStatus | null;
};

export function isApproved(subject?: AccessSubject | null) {
  return Boolean(subject?.id && subject.approvalStatus === "APPROVED");
}

export function canAccessFamilyFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject) && (subject?.role === "FAMILY" || subject?.role === "ADMIN"));
}

export function canAccessInvestmentsFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject) && subject?.role === "ADMIN");
}

export function canAccessAdminFromSubject(subject?: AccessSubject | null) {
  return Boolean(isApproved(subject) && subject?.role === "ADMIN");
}
