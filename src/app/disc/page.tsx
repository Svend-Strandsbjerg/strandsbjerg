import { DiscAssessmentClient } from "@/app/disc/disc-assessment-client";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiscAssessmentPage() {
  const user = await requireUser();
  const companyMembership = await prisma.companyMembership.findFirst({
    where: {
      userId: user.id,
      role: {
        in: ["COMPANY_ADMIN", "COMPANY_RECRUITER"],
      },
    },
    select: { id: true },
  });
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
    },
  });

  return <DiscAssessmentClient userId={user.id} assessments={assessments} hasCompanyDiscAccess={Boolean(companyMembership)} />;
}
