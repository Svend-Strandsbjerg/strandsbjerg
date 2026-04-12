import "server-only";

import { type CompanyRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getUserCompanyRole(userId: string, companyId: string): Promise<CompanyRole | null> {
  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    select: { role: true },
  });

  return membership?.role ?? null;
}

export async function isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
  return (await getUserCompanyRole(userId, companyId)) === "COMPANY_ADMIN";
}

export async function isCompanyRecruiter(userId: string, companyId: string): Promise<boolean> {
  const role = await getUserCompanyRole(userId, companyId);

  return role === "COMPANY_ADMIN" || role === "COMPANY_RECRUITER";
}
