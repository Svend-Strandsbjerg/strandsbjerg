import Link from "next/link";

import { AdminEditor } from "@/app/admin/admin-editor";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { canAccessSiteAdmin, requireUser } from "@/lib/access";
import { getHomeContent, getProfessionalContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SiteAdminPage() {
  const user = await requireUser();

  if (!canAccessSiteAdmin(user)) {
    return (
      <AdminAccessDenied
        title="Ingen adgang til siteadministration"
        message="Denne side kræver rettigheden Site admin eller Generel admin."
      />
    );
  }

  const [homeContent, professionalContent] = await Promise.all([getHomeContent(), getProfessionalContent()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="underline">Tilbage til admincockpit</Link>
      </p>
      <AdminEditor homeContent={homeContent} professionalContent={professionalContent} />
    </div>
  );
}
