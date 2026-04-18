import "server-only";

import { CompanyLicenseStatus, CompanyRole, CompanyStatus, type Company } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const COMPANY_ACCESS_ROLES = [CompanyRole.COMPANY_ADMIN, CompanyRole.COMPANY_VIEWER] as const;
const ACTIVE_COMPANY_STATUSES = [CompanyStatus.ACTIVE] as const;
const ACTIVE_COMPANY_LICENSE_STATUSES = [CompanyLicenseStatus.ACTIVE, CompanyLicenseStatus.TRIAL] as const;

export function canSelfServiceCreateCompany() {
  return process.env.DISC_COMPANY_SELF_SERVICE_CREATION === "true";
}

function isCompanyOperational(company: Pick<Company, "status" | "licenseStatus">) {
  return ACTIVE_COMPANY_STATUSES.includes(company.status) && ACTIVE_COMPANY_LICENSE_STATUSES.includes(company.licenseStatus);
}

export async function getUserCompanyRole(userId: string, companyId: string): Promise<CompanyRole | null> {
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
          status: true,
          licenseStatus: true,
        },
      },
    },
  });

  if (!membership || !isCompanyOperational(membership.company)) {
    return null;
  }

  return membership.role;
}

export async function isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
  return (await getUserCompanyRole(userId, companyId)) === CompanyRole.COMPANY_ADMIN;
}

export async function isCompanyViewer(userId: string, companyId: string): Promise<boolean> {
  const role = await getUserCompanyRole(userId, companyId);
  return role === CompanyRole.COMPANY_ADMIN || role === CompanyRole.COMPANY_VIEWER;
}

export async function canAccessCompanyArea(userId: string) {
  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId,
      role: {
        in: COMPANY_ACCESS_ROLES,
      },
      company: {
        status: {
          in: ACTIVE_COMPANY_STATUSES,
        },
        licenseStatus: {
          in: ACTIVE_COMPANY_LICENSE_STATUSES,
        },
      },
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function canViewCompany(userId: string, companyId: string) {
  return isCompanyViewer(userId, companyId);
}

export async function canManageCompany(userId: string, companyId: string) {
  return isCompanyAdmin(userId, companyId);
}

export async function canCreateCompanyProfile(userId: string, globalRole?: "ADMIN" | "USER") {
  if (globalRole === "ADMIN") {
    return true;
  }

  if (!canSelfServiceCreateCompany()) {
    return false;
  }

  const membership = await prisma.companyMembership.findFirst({
    where: { userId },
    select: { id: true },
  });

  return !membership;
}

export async function getCompanyAreaMemberships(userId: string) {
  return prisma.companyMembership.findMany({
    where: {
      userId,
      role: {
        in: COMPANY_ACCESS_ROLES,
      },
      company: {
        status: {
          in: ACTIVE_COMPANY_STATUSES,
        },
        licenseStatus: {
          in: ACTIVE_COMPANY_LICENSE_STATUSES,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          status: true,
          licenseStatus: true,
          planTier: true,
          seatLimit: true,
          selfServiceCreationEnabled: true,
          invites: {
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
              id: true,
              token: true,
              candidateName: true,
              candidateEmail: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              createdByUser: {
                select: {
                  name: true,
                  email: true,
                },
              },
              assessments: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                  submittedAt: true,
                  userId: true,
                  resultShare: {
                    select: {
                      token: true,
                    },
                  },
                },
              },
            },
          },
          assessments: {
            where: { status: "SUBMITTED" },
            orderBy: { submittedAt: "desc" },
            take: 20,
            select: {
              id: true,
              externalSessionId: true,
              candidateName: true,
              candidateEmail: true,
              userId: true,
              submittedAt: true,
              createdAt: true,
              status: true,
              rawResponses: true,
              resultShare: {
                select: {
                  token: true,
                  expiresAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
