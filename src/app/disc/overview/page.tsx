import { DiscAssessmentClient } from "@/app/disc/disc-assessment-client";
import { requireUser } from "@/lib/access";
import { ensureAssessmentResultShare } from "@/lib/disc-result-share";
import { canAccessCompanyArea } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiscOverviewPage() {
  const user = await requireUser();
  const totalAssessmentCountPromise = prisma.discAssessment.count({
    where: { userId: user.id },
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
      assessments={assessmentsWithShares}
      totalAssessmentCount={totalAssessmentCount}
      hasCompanyDiscAccess={hasCompanyAreaAccess}
    />
  );
}
