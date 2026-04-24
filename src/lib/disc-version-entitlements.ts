import "server-only";

import { CompanyLicenseStatus, CompanyRole, CompanyStatus, DiscTierAccess, type User } from "@prisma/client";

import { getDiscAssessmentVersions } from "@/lib/disc-engine";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type {
  DiscAssessmentVersion,
  DiscReportTier,
  DiscTierAccessLevel,
  DiscVersionCategory,
  DiscVersionEntitlement,
  DiscVersionEntitlementReason,
  DiscVersionEntitlementStatus,
} from "@/lib/disc-types";

type DiscEntitlementFlow = "personal" | "invite";

type DiscVersionEntitlementContext = {
  flow: DiscEntitlementFlow;
  user: Pick<User, "id" | "role"> | null;
  inviteToken?: string | null;
  companyId?: string | null;
  companyMembershipRole?: CompanyRole | null;
};

type EntitlementAccessInputs = {
  userTierOverride: DiscTierAccess | null;
  inheritedCompanyTier: DiscTierAccess | null;
  inviteCompanyTier: DiscTierAccess | null;
};

type EffectiveEntitlementPolicy = {
  maxTier: DiscTierAccessLevel;
  source: "default_free" | "user_override" | "company_inherited" | "company_invite";
  context: "personal" | "invite";
  inputs: EntitlementAccessInputs;
};

export type DiscVersionEntitlementResolution = {
  discoveryState: "ok" | "empty" | "failed";
  discoveredVersions: DiscAssessmentVersion[];
  entitlements: DiscVersionEntitlement[];
  visibleEntitlements: DiscVersionEntitlement[];
  selectableEntitlements: DiscVersionEntitlement[];
  autoSelectedAssessmentVersionId: string | null;
  policy: EffectiveEntitlementPolicy;
};

function normalizeVersionText(version: DiscAssessmentVersion) {
  const raw = [version.id, version.displayName, version.description, version.intendedUse].filter((value): value is string => Boolean(value)).join(" ");
  return raw.toLowerCase();
}

export function inferDiscVersionCategory(version: DiscAssessmentVersion): DiscVersionCategory {
  const normalizedTier = version.tier?.toLowerCase().trim();
  if (normalizedTier === "free") {
    return "free";
  }
  if (normalizedTier === "standard") {
    return "standard";
  }
  if (normalizedTier === "deep") {
    return "deep";
  }

  const text = normalizeVersionText(version);
  if (text.includes("free") || text.includes("gratis")) {
    return "free";
  }
  if (text.includes("standard")) {
    return "standard";
  }
  if (text.includes("deep") || text.includes("advanced") || text.includes("pro")) {
    return "deep";
  }
  return "unknown";
}

function selectBaselineFreeVersionId(versions: DiscAssessmentVersion[]): string | null {
  const explicitFree = versions.find((version) => inferDiscVersionCategory(version) === "free");
  if (explicitFree) {
    return explicitFree.id;
  }

  const defaultVersion = versions.find((version) => version.isDefault);
  if (defaultVersion) {
    return defaultVersion.id;
  }

  const byQuestionCount = [...versions]
    .filter((version) => typeof version.expectedQuestionCount === "number" && version.expectedQuestionCount > 0)
    .sort((left, right) => (left.expectedQuestionCount ?? Number.MAX_SAFE_INTEGER) - (right.expectedQuestionCount ?? Number.MAX_SAFE_INTEGER))[0];

  if (byQuestionCount) {
    return byQuestionCount.id;
  }

  return versions[0]?.id ?? null;
}

export function resolveDiscReportTierFromCategory(category: DiscVersionCategory): DiscReportTier {
  if (category === "standard" || category === "deep") {
    return category;
  }

  return "free";
}

export function resolveDiscReportTierFromVersion(version: DiscAssessmentVersion | null | undefined): DiscReportTier {
  if (!version) {
    return "free";
  }

  return resolveDiscReportTierFromCategory(inferDiscVersionCategory(version));
}

export function resolveDiscReportTierForAssessmentVersionId(versions: DiscAssessmentVersion[], assessmentVersionId: string): DiscReportTier {
  const matchingVersion = versions.find((version) => version.id === assessmentVersionId);
  return resolveDiscReportTierFromVersion(matchingVersion);
}

export async function getDiscReportTierForAssessmentVersionId(assessmentVersionId: string): Promise<DiscReportTier> {
  try {
    const discoveredVersions = await getDiscAssessmentVersions();
    return resolveDiscReportTierForAssessmentVersionId(discoveredVersions, assessmentVersionId);
  } catch (error) {
    logServerEvent("warn", "disc_report_tier_discovery_failed", {
      assessmentVersionId,
      fallbackTier: "free",
      error,
    });
    return "free";
  }
}

function toTierLevel(tier: DiscTierAccess | null): DiscTierAccessLevel | null {
  if (!tier) {
    return null;
  }

  if (tier === DiscTierAccess.STANDARD) {
    return "standard";
  }

  if (tier === DiscTierAccess.DEEP) {
    return "deep";
  }

  return "free";
}

function tierPriority(level: DiscTierAccessLevel): number {
  if (level === "deep") {
    return 3;
  }

  if (level === "standard") {
    return 2;
  }

  return 1;
}

function chooseHigherTier(left: DiscTierAccessLevel, right: DiscTierAccessLevel): DiscTierAccessLevel {
  return tierPriority(left) >= tierPriority(right) ? left : right;
}

function categoryFitsTier(category: DiscVersionCategory, maxTier: DiscTierAccessLevel) {
  if (category === "unknown") {
    return false;
  }

  if (category === "free") {
    return true;
  }

  if (category === "standard") {
    return maxTier === "standard" || maxTier === "deep";
  }

  return maxTier === "deep";
}

function toEntitlementPolicy(context: DiscVersionEntitlementContext, policy: EffectiveEntitlementPolicy, category: DiscVersionCategory): { status: DiscVersionEntitlementStatus; reason: DiscVersionEntitlementReason } {
  if (category === "unknown") {
    return {
      status: context.flow === "invite" ? "hidden" : "locked",
      reason: "not_configured",
    };
  }

  if (!categoryFitsTier(category, policy.maxTier)) {
    return {
      status: "locked",
      reason: context.flow === "invite" ? "context_restricted" : "upgrade_required",
    };
  }

  if (context.flow === "invite") {
    return {
      status: "selectable",
      reason: "company_invite_policy",
    };
  }

  if (policy.source === "company_inherited") {
    return {
      status: "selectable",
      reason: "company_policy",
    };
  }

  if (policy.source === "user_override") {
    return {
      status: "selectable",
      reason: "personal_upgrade",
    };
  }

  return {
    status: "selectable",
    reason: "free_access",
  };
}

async function resolveAccessInputs(context: DiscVersionEntitlementContext): Promise<EntitlementAccessInputs> {
  if (!context.user?.id) {
    return {
      userTierOverride: null,
      inheritedCompanyTier: null,
      inviteCompanyTier: null,
    };
  }

  const [userRecord, memberships, inviteCompany] = await Promise.all([
    prisma.user.findUnique({
      where: { id: context.user.id },
      select: {
        discMaxTierOverride: true,
      },
    }),
    prisma.companyMembership.findMany({
      where: {
        userId: context.user.id,
        company: {
          status: CompanyStatus.ACTIVE,
          licenseStatus: { in: [CompanyLicenseStatus.ACTIVE, CompanyLicenseStatus.TRIAL] },
        },
      },
      select: {
        companyId: true,
        role: true,
        company: {
          select: {
            discMaxTierAccess: true,
          },
        },
      },
    }),
    context.companyId
      ? prisma.company.findUnique({
          where: { id: context.companyId },
          select: {
            status: true,
            licenseStatus: true,
            discMaxTierAccess: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const inheritedCompanyTier = memberships.reduce<DiscTierAccess | null>((highest, membership) => {
    if (!highest) {
      return membership.company.discMaxTierAccess;
    }

    return tierPriority(toTierLevel(membership.company.discMaxTierAccess) ?? "free") > tierPriority(toTierLevel(highest) ?? "free")
      ? membership.company.discMaxTierAccess
      : highest;
  }, null);

  return {
    userTierOverride: userRecord?.discMaxTierOverride ?? null,
    inheritedCompanyTier,
    inviteCompanyTier:
      inviteCompany &&
      inviteCompany.status === CompanyStatus.ACTIVE &&
      (inviteCompany.licenseStatus === CompanyLicenseStatus.ACTIVE || inviteCompany.licenseStatus === CompanyLicenseStatus.TRIAL)
        ? inviteCompany.discMaxTierAccess
        : null,
  };
}

function resolveEffectivePolicy(context: DiscVersionEntitlementContext, inputs: EntitlementAccessInputs): EffectiveEntitlementPolicy {
  if (context.flow === "invite") {
    const inviteTier = toTierLevel(inputs.inviteCompanyTier) ?? "free";
    return {
      maxTier: inviteTier,
      source: "company_invite",
      context: "invite",
      inputs,
    };
  }

  const base = "free" as DiscTierAccessLevel;
  const withUserOverride = inputs.userTierOverride ? chooseHigherTier(base, toTierLevel(inputs.userTierOverride) ?? "free") : base;
  const withInheritedCompany = inputs.inheritedCompanyTier ? chooseHigherTier(withUserOverride, toTierLevel(inputs.inheritedCompanyTier) ?? "free") : withUserOverride;

  if (inputs.inheritedCompanyTier && tierPriority(withInheritedCompany) > tierPriority(withUserOverride)) {
    return {
      maxTier: withInheritedCompany,
      source: "company_inherited",
      context: "personal",
      inputs,
    };
  }

  if (inputs.userTierOverride && tierPriority(withUserOverride) > tierPriority(base)) {
    return {
      maxTier: withUserOverride,
      source: "user_override",
      context: "personal",
      inputs,
    };
  }

  return {
    maxTier: base,
    source: "default_free",
    context: "personal",
    inputs,
  };
}

export function resolveDiscVersionEntitlements(input: DiscVersionEntitlementContext & { discoveredVersions: DiscAssessmentVersion[]; policy: EffectiveEntitlementPolicy }): DiscVersionEntitlementResolution {
  const baselineFreeVersionId = selectBaselineFreeVersionId(input.discoveredVersions);
  const entitlements = input.discoveredVersions.map((version) => {
    const inferredCategory = inferDiscVersionCategory(version);
    const category = inferredCategory === "unknown" && baselineFreeVersionId === version.id ? "free" : inferredCategory;
    const policy = toEntitlementPolicy(input, input.policy, category);

    return {
      version,
      category,
      status: policy.status,
      reason: policy.reason,
    } satisfies DiscVersionEntitlement;
  });

  const visibleEntitlements = entitlements.filter((entitlement) => entitlement.status !== "hidden");
  const selectableEntitlements = visibleEntitlements.filter((entitlement) => entitlement.status === "selectable");
  const autoSelectedAssessmentVersionId = selectableEntitlements.length === 1 ? selectableEntitlements[0].version.id : null;

  return {
    discoveryState: "ok",
    discoveredVersions: input.discoveredVersions,
    entitlements,
    visibleEntitlements,
    selectableEntitlements,
    autoSelectedAssessmentVersionId,
    policy: input.policy,
  };
}

function logEntitlementSummary(context: DiscVersionEntitlementContext, resolution: DiscVersionEntitlementResolution) {
  logServerEvent("info", "disc_version_entitlements_resolved", {
    flow: context.flow,
    userId: context.user?.id ?? null,
    userRole: context.user?.role ?? null,
    inviteToken: context.inviteToken ?? null,
    companyId: context.companyId ?? null,
    companyMembershipRole: context.companyMembershipRole ?? null,
    entitlementSource: resolution.policy.source,
    entitlementMaxTier: resolution.policy.maxTier,
    userTierOverride: resolution.policy.inputs.userTierOverride,
    inheritedCompanyTier: resolution.policy.inputs.inheritedCompanyTier,
    inviteCompanyTier: resolution.policy.inputs.inviteCompanyTier,
    discoveredVersionCount: resolution.discoveredVersions.length,
    discoveredVersionIds: resolution.discoveredVersions.map((version) => version.id),
    selectableVersionIds: resolution.selectableEntitlements.map((entitlement) => entitlement.version.id),
    visibleVersionIds: resolution.visibleEntitlements.map((entitlement) => entitlement.version.id),
    lockedVersionIds: resolution.visibleEntitlements.filter((entitlement) => entitlement.status === "locked").map((entitlement) => entitlement.version.id),
    hiddenVersionIds: resolution.entitlements.filter((entitlement) => entitlement.status === "hidden").map((entitlement) => entitlement.version.id),
    lockedReasons: resolution.visibleEntitlements.filter((entitlement) => entitlement.status === "locked").map((entitlement) => `${entitlement.version.id}:${entitlement.reason}`),
    selectedVersionId: resolution.autoSelectedAssessmentVersionId,
  });
}

export async function getPersonalDiscVersionEntitlements(input: { user: Pick<User, "id" | "role"> }): Promise<DiscVersionEntitlementResolution> {
  const accessInputs = await resolveAccessInputs({ flow: "personal", user: input.user });
  const policy = resolveEffectivePolicy({ flow: "personal", user: input.user }, accessInputs);
  let discoveredVersions: DiscAssessmentVersion[] = [];
  let discoveryState: "ok" | "empty" | "failed" = "ok";

  try {
    discoveredVersions = await getDiscAssessmentVersions();
    discoveryState = discoveredVersions.length === 0 ? "empty" : "ok";
  } catch (error) {
    discoveryState = "failed";
    logServerEvent("warn", "disc_personal_entitlements_discovery_failed", {
      userId: input.user.id,
      fallback: "empty_entitlements",
      error,
    });
  }

  const resolution = resolveDiscVersionEntitlements({
    flow: "personal",
    user: input.user,
    discoveredVersions,
    policy,
  });
  resolution.discoveryState = discoveryState;

  logEntitlementSummary(
    {
      flow: "personal",
      user: input.user,
    },
    resolution,
  );

  return resolution;
}

export async function getInviteDiscVersionEntitlements(input: {
  user: Pick<User, "id" | "role">;
  inviteToken: string;
  companyId?: string | null;
}): Promise<DiscVersionEntitlementResolution> {
  const membership = input.companyId
    ? await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: input.user.id,
            companyId: input.companyId,
          },
        },
        select: { role: true },
      })
    : null;

  const [discoveredVersions, accessInputs] = await Promise.all([
    getDiscAssessmentVersions(),
    resolveAccessInputs({
      flow: "invite",
      user: input.user,
      inviteToken: input.inviteToken,
      companyId: input.companyId ?? null,
      companyMembershipRole: membership?.role ?? null,
    }),
  ]);

  const policy = resolveEffectivePolicy(
    {
      flow: "invite",
      user: input.user,
      inviteToken: input.inviteToken,
      companyId: input.companyId ?? null,
      companyMembershipRole: membership?.role ?? null,
    },
    accessInputs,
  );

  const resolution = resolveDiscVersionEntitlements({
    flow: "invite",
    user: input.user,
    inviteToken: input.inviteToken,
    companyId: input.companyId ?? null,
    companyMembershipRole: membership?.role ?? null,
    discoveredVersions,
    policy,
  });
  resolution.discoveryState = discoveredVersions.length === 0 ? "empty" : "ok";

  logEntitlementSummary(
    {
      flow: "invite",
      user: input.user,
      inviteToken: input.inviteToken,
      companyId: input.companyId ?? null,
      companyMembershipRole: membership?.role ?? null,
    },
    resolution,
  );

  return resolution;
}

export function assertSelectableVersion(resolution: DiscVersionEntitlementResolution, assessmentVersionId: string): DiscVersionEntitlement | null {
  const matching = resolution.entitlements.find((entitlement) => entitlement.version.id === assessmentVersionId);
  if (!matching || matching.status !== "selectable") {
    return null;
  }

  return matching;
}
