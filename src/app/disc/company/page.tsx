import { headers } from "next/headers";

import { CompanyDiscAdmin } from "@/app/disc/company/company-disc-admin";
import { CompanyProfileSetup } from "@/app/disc/company/company-profile-setup";
import { requireUser } from "@/lib/access";
import { canCreateCompanyProfile, getCompanyAreaMemberships } from "@/lib/company-access";

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
  const memberships = await getCompanyAreaMemberships(user.id);

  if (memberships.length === 0) {
    const mayCreateCompany = await canCreateCompanyProfile(user.id, user.role);

    if (!mayCreateCompany) {
      return (
        <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Virksomheds-overblik · DISC</h1>
          <p className="text-sm text-muted-foreground">
            Du har ikke adgang til virksomhedsområdet. Kontakt en company admin eller global admin for at få adgang.
          </p>
        </div>
      );
    }

    return <CompanyProfileSetup />;
  }

  return (
    <CompanyDiscAdmin
      companies={memberships.map((membership) => ({
        ...membership.company,
        membershipRole: membership.role,
      }))}
      origin={inferOrigin(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))}
    />
  );
}
