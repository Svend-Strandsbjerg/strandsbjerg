export type DiscResponseInput = {
  sessionId: string;
  questionId: string;
  selectedOptionIds: string[];
};

export type DiscQuestionOption = {
  id: string;
  label: string;
};

export type DiscQuestion = {
  id: string;
  prompt: string;
  options: DiscQuestionOption[];
};

export type DiscAssessmentVersion = {
  id: string;
  displayName: string;
  description: string | null;
  intendedUse: string | null;
  expectedQuestionCount: number | null;
  estimatedDurationMinutes: number | null;
  tier: string | null;
  deliveryMode: string | null;
  isDefault: boolean;
};

export type DiscVersionCategory = "free" | "standard" | "deep" | "unknown";
export type DiscReportTier = "free" | "standard" | "deep";

export type DiscVersionEntitlementStatus = "selectable" | "locked" | "hidden";

export type DiscVersionEntitlementReason =
  | "free_access"
  | "personal_upgrade"
  | "company_policy"
  | "company_invite_policy"
  | "context_restricted"
  | "upgrade_required"
  | "not_configured"
  | "unknown";

export type DiscVersionEntitlement = {
  version: DiscAssessmentVersion;
  category: DiscVersionCategory;
  status: DiscVersionEntitlementStatus;
  reason: DiscVersionEntitlementReason;
};

export type DiscTierAccessLevel = "free" | "standard" | "deep";
