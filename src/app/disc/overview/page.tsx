import { DiscAssessmentClient } from "@/app/disc/disc-assessment-client";
import { requireUser } from "@/lib/access";
import { ensureAssessmentResultShare } from "@/lib/disc-result-share";
import { getPersonalDiscVersionEntitlements } from "@/lib/disc-version-entitlements";
import type { DiscVersionEntitlement } from "@/lib/disc-types";
import { canAccessCompanyArea } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DiscOverviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscOverviewPage({ searchParams }: DiscOverviewPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const promoEntryState = getSingleParam(params, "promo");
  const user = await requireUser();
  let versionEntitlements: DiscVersionEntitlement[] = [];
  let autoSelectedAssessmentVersionId: string | null = null;
  const resolution = await getPersonalDiscVersionEntitlements({
    user: { id: user.id, role: user.role ?? "USER" },
  });
  versionEntitlements = resolution.visibleEntitlements;
  autoSelectedAssessmentVersionId = resolution.autoSelectedAssessmentVersionId;
  const versionDiscoveryMessage =
    resolution.discoveryState === "empty"
      ? "DISC-tests er midlertidigt ikke tilgængelige, fordi DISC-motoren returnerer 0 assessment-versioner fra /products/disc/versions. Dette er en engine-konfiguration/seed-fejl (ikke en frontend-adgangsfejl)."
      : resolution.discoveryState === "failed"
        ? "DISC-versioner kunne ikke hentes lige nu. Prøv igen om lidt."
        : null;

  const totalAssessmentCountPromise = prisma.discAssessment.count({
    where: { userId: user.id },
  });
  const promoCreditsPromise = prisma.discPromoRedemption.aggregate({
    where: {
      userId: user.id,
      promoLink: {
        active: true,
      },
    },
    _sum: {
      grantedCredits: true,
      consumedCredits: true,
    },
  });
  const hasCompanyAreaAccess = await canAccessCompanyArea(user.id);
  const assessments = await prisma.discAssessment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      externalSessionId: true,
      createdAt: true,
      submittedAt: true,
      rawResponses: true,
      resultShare: {
        select: {
          token: true,
        },
      },
    },
  });
  const totalAssessmentCount = await totalAssessmentCountPromise;
  const promoCredits = await promoCreditsPromise;
  const remainingPromoCredits = Math.max(0, (promoCredits._sum.grantedCredits ?? 0) - (promoCredits._sum.consumedCredits ?? 0));

  const assessmentsWithShares = await Promise.all(
    assessments.map(async (assessment) => {
      if (assessment.status !== "SUBMITTED") {
        return assessment;
      }

      if (assessment.resultShare?.token) {
        return assessment;
      }

      const share = await ensureAssessmentResultShare(assessment.id);
      return {
        ...assessment,
        resultShare: {
          token: share.token,
        },
      };
    }),
  );

  return (
    <DiscAssessmentClient
      userId={user.id}
      versionEntitlements={versionEntitlements}
      autoSelectedAssessmentVersionId={autoSelectedAssessmentVersionId}
      versionDiscoveryMessage={versionDiscoveryMessage}
      assessments={assessmentsWithShares}
      totalAssessmentCount={totalAssessmentCount}
      hasCompanyDiscAccess={hasCompanyAreaAccess}
      remainingPromoCredits={remainingPromoCredits}
      promoEntryState={promoEntryState}
    />
  );
}
