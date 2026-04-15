import { headers } from "next/headers";

import { CompanyDiscAdmin } from "@/app/disc/company/company-disc-admin";
import { CompanyProfileSetup } from "@/app/disc/company/company-profile-setup";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function inferOrigin(hostHeader: string | null) {
  if (!hostHeader) {
    return "http://localhost:3000";
  }

  const protocol = hostHeader.includes("localhost") ? "http" : "https";
  return `${protocol}://${hostHeader}`;
}

export default async function CompanyDiscPage() {
  const user = await requireUser();
  const requestHeaders = await headers();
  const companies = await prisma.companyMembership.findMany({
    where: {
      userId: user.id,
      role: {
        in: ["COMPANY_ADMIN", "COMPANY_RECRUITER"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      company: {
        select: {
          id: true,
          name: true,
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

  if (companies.length === 0) {
    return <CompanyProfileSetup />;
  }

  return (
    <CompanyDiscAdmin
      companies={companies.map((membership) => membership.company)}
      origin={inferOrigin(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))}
    />
  );
}
