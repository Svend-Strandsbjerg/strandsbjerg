import type { AssessmentInviteStatus, DiscAssessmentStatus } from "@prisma/client";

export type InviteLifecycleStatus = "created" | "pending" | "started" | "completed" | "expired" | "closed";

export type InviteStatusInput = {
  inviteStatus: AssessmentInviteStatus;
  expiresAt: Date;
  claimedAt: Date | null;
  completedAt: Date | null;
  latestAssessmentStatus: DiscAssessmentStatus | null;
};

export function deriveInviteLifecycleStatus(input: InviteStatusInput): InviteLifecycleStatus {
  if (input.inviteStatus === "INVALIDATED") {
    return "closed";
  }

  if (input.inviteStatus === "COMPLETED" || input.completedAt || input.latestAssessmentStatus === "SUBMITTED") {
    return "completed";
  }

  if (input.expiresAt.getTime() <= Date.now()) {
    return "expired";
  }

  if (input.claimedAt || input.latestAssessmentStatus === "STARTED") {
    return "started";
  }

  if (input.inviteStatus === "ACTIVE") {
    return "pending";
  }

  return "created";
}

export function toInviteStatusLabel(status: InviteLifecycleStatus) {
  switch (status) {
    case "created":
      return "Created";
    case "pending":
      return "Sent / Pending";
    case "started":
      return "Started";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}
