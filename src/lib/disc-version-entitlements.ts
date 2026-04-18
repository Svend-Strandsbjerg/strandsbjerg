import "server-only";

import { CompanyRole, type User } from "@prisma/client";

import { getDiscAssessmentVersions } from "@/lib/disc-engine";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type {
  DiscAssessmentVersion,
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

export type DiscVersionEntitlementResolution = {
  discoveredVersions: DiscAssessmentVersion[];
  entitlements: DiscVersionEntitlement[];
  visibleEntitlements: DiscVersionEntitlement[];
  selectableEntitlements: DiscVersionEntitlement[];
  autoSelectedAssessmentVersionId: string | null;
};

function normalizeVersionText(version: DiscAssessmentVersion) {
  const raw = [version.id, version.displayName, version.description, version.intendedUse].filter((value): value is string => Boolean(value)).join(" ");
  return raw.toLowerCase();
}

export function inferDiscVersionCategory(version: DiscAssessmentVersion): DiscVersionCategory {
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

function selectPersonalStatus(category: DiscVersionCategory): { status: DiscVersionEntitlementStatus; reason: DiscVersionEntitlementReason } {
  if (category === "free") {
    return { status: "selectable", reason: "free_access" };
  }

  return { status: "locked", reason: "upgrade_required" };
}

function selectInviteStatus(context: DiscVersionEntitlementContext, category: DiscVersionCategory): { status: DiscVersionEntitlementStatus; reason: DiscVersionEntitlementReason } {
  if (context.user?.role === "ADMIN") {
    return { status: "selectable", reason: "admin_only" };
  }

  if (context.companyMembershipRole === CompanyRole.COMPANY_ADMIN) {
    return { status: "selectable", reason: "admin_only" };
  }

  if (category === "unknown") {
    return { status: "locked", reason: "company_restricted" };
  }

  return { status: "selectable", reason: "invite_access" };
}

export function resolveDiscVersionEntitlements(input: DiscVersionEntitlementContext & { discoveredVersions: DiscAssessmentVersion[] }): DiscVersionEntitlementResolution {
  const entitlements = input.discoveredVersions.map((version) => {
    const category = inferDiscVersionCategory(version);
    const policy = input.flow === "invite" ? selectInviteStatus(input, category) : selectPersonalStatus(category);

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
    discoveredVersions: input.discoveredVersions,
    entitlements,
    visibleEntitlements,
    selectableEntitlements,
    autoSelectedAssessmentVersionId,
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
    discoveredVersionCount: resolution.discoveredVersions.length,
    selectableVersionIds: resolution.selectableEntitlements.map((entitlement) => entitlement.version.id),
    visibleVersionIds: resolution.visibleEntitlements.map((entitlement) => entitlement.version.id),
    lockedVersionIds: resolution.visibleEntitlements.filter((entitlement) => entitlement.status === "locked").map((entitlement) => entitlement.version.id),
    hiddenVersionIds: resolution.entitlements.filter((entitlement) => entitlement.status === "hidden").map((entitlement) => entitlement.version.id),
  });
}

export async function getPersonalDiscVersionEntitlements(input: { user: Pick<User, "id" | "role"> }): Promise<DiscVersionEntitlementResolution> {
  const discoveredVersions = await getDiscAssessmentVersions();
  const resolution = resolveDiscVersionEntitlements({
    flow: "personal",
    user: input.user,
    discoveredVersions,
  });

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

  const discoveredVersions = await getDiscAssessmentVersions();
  const resolution = resolveDiscVersionEntitlements({
    flow: "invite",
    user: input.user,
    inviteToken: input.inviteToken,
    companyId: input.companyId ?? null,
    companyMembershipRole: membership?.role ?? null,
    discoveredVersions,
  });

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
