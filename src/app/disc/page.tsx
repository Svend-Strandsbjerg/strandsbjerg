import { DiscAssessmentClient } from "@/app/disc/disc-assessment-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiscAssessmentPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const assessments = userId
    ? await prisma.discAssessment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          externalSessionId: true,
          createdAt: true,
          submittedAt: true,
        },
      })
    : [];

  return <DiscAssessmentClient userId={userId ?? null} assessments={assessments} />;
}
