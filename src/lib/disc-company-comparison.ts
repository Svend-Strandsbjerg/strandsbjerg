import "server-only";

import { CompanyRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CompanyComparisonCandidate = {
  personKey: string;
  displayName: string;
  assessmentId: string;
  submittedAt: Date | null;
  status: "SUBMITTED";
  rawResponses: unknown;
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function buildPersonKey(assessment: {
  id: string;
  userId: string | null;
  candidateEmail: string | null;
  candidateName: string | null;
}) {
  if (assessment.userId) {
    return `user:${assessment.userId}`;
  }

  if (assessment.candidateEmail) {
    return `email:${normalizeValue(assessment.candidateEmail)}`;
  }

  if (assessment.candidateName) {
    return `name:${normalizeValue(assessment.candidateName)}`;
  }

  return `assessment:${assessment.id}`;
}

function buildDisplayName(assessment: {
  user: { name: string | null; email: string | null } | null;
  candidateName: string | null;
  candidateEmail: string | null;
  id: string;
}) {
  return (
    assessment.user?.name ??
    assessment.candidateName ??
    assessment.user?.email ??
    assessment.candidateEmail ??
    `Assessment ${assessment.id.slice(0, 8)}`
  );
}

export async function getLatestCompanyComparisonCandidates(companyId: string): Promise<CompanyComparisonCandidate[]> {
  const submittedAssessments = await prisma.discAssessment.findMany({
    where: {
      companyId,
      status: "SUBMITTED",
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      userId: true,
      candidateName: true,
      candidateEmail: true,
      submittedAt: true,
      status: true,
      rawResponses: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: 500,
  });

  const latestByPerson = new Map<string, CompanyComparisonCandidate>();

  for (const assessment of submittedAssessments) {
    const personKey = buildPersonKey(assessment);
    if (latestByPerson.has(personKey)) {
      continue;
    }

    latestByPerson.set(personKey, {
      personKey,
      displayName: buildDisplayName(assessment),
      assessmentId: assessment.id,
      submittedAt: assessment.submittedAt,
      status: "SUBMITTED",
      rawResponses: assessment.rawResponses,
    });
  }

  return Array.from(latestByPerson.values()).sort((a, b) => {
    const aTime = a.submittedAt?.getTime() ?? 0;
    const bTime = b.submittedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export async function getAuthorizedCompanyForComparison(userId: string, companyId: string) {
  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    select: {
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          status: true,
          licenseStatus: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  if (membership.role !== CompanyRole.COMPANY_ADMIN && membership.role !== CompanyRole.COMPANY_VIEWER) {
    return null;
  }

  if (membership.company.status !== "ACTIVE" || !["ACTIVE", "TRIAL"].includes(membership.company.licenseStatus)) {
    return null;
  }

  return {
    role: membership.role,
    company: membership.company,
  };
}
