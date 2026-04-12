import "server-only";

import { DiscAssessmentStatus, type Prisma } from "@prisma/client";

import { ensureAssessmentResultShare } from "@/lib/disc-result-share";
import { prisma } from "@/lib/prisma";

export function getConfiguredDiscAssessmentVersionId() {
  const value = process.env.DISC_ENGINE_ASSESSMENT_VERSION_ID;

  if (!value) {
    throw new Error("Missing required env var: DISC_ENGINE_ASSESSMENT_VERSION_ID");
  }

  return value;
}

type CreateAssessmentInput = {
  externalSessionId: string;
  userId?: string | null;
  inviteId?: string | null;
  companyId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
};

export async function createDiscAssessmentRecord(input: CreateAssessmentInput) {
  return prisma.discAssessment.upsert({
    where: { externalSessionId: input.externalSessionId },
    update: {
      userId: input.userId ?? null,
      inviteId: input.inviteId ?? null,
      companyId: input.companyId ?? null,
      candidateName: input.candidateName ?? null,
      candidateEmail: input.candidateEmail ?? null,
      status: DiscAssessmentStatus.STARTED,
    },
    create: {
      externalSessionId: input.externalSessionId,
      assessmentVersionId: getConfiguredDiscAssessmentVersionId(),
      userId: input.userId ?? null,
      inviteId: input.inviteId ?? null,
      companyId: input.companyId ?? null,
      candidateName: input.candidateName ?? null,
      candidateEmail: input.candidateEmail ?? null,
      status: DiscAssessmentStatus.STARTED,
    },
  });
}

export async function markDiscAssessmentSubmitted(params: {
  externalSessionId: string;
  rawResponses: Prisma.InputJsonValue;
}) {
  const assessment = await prisma.discAssessment.upsert({
    where: { externalSessionId: params.externalSessionId },
    update: {
      rawResponses: params.rawResponses,
      status: DiscAssessmentStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    create: {
      externalSessionId: params.externalSessionId,
      assessmentVersionId: getConfiguredDiscAssessmentVersionId(),
      status: DiscAssessmentStatus.SUBMITTED,
      submittedAt: new Date(),
      rawResponses: params.rawResponses,
    },
  });

  await ensureAssessmentResultShare(assessment.id);

  return assessment;
}
