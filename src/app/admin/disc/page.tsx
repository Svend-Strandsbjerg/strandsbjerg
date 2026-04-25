import { DiscAdminAccessDenied } from "@/components/admin/disc-admin-access-denied";
import { DiscAdminCockpit } from "@/components/admin/disc-admin-cockpit";
import { canAccessAdmin, canAccessDiscAdmin, canAccessSiteAdmin, requireUser } from "@/lib/access";
import { getDiscAdminDashboardData, getSingleParam } from "@/lib/admin/disc-admin";
import { logServerEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

type DiscAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDiscPage({ searchParams }: DiscAdminPageProps) {
  const user = await requireUser();
  const hasAdminAccess = canAccessAdmin(user);
  const hasDiscAdminAccess = canAccessDiscAdmin(user);
  const hasCockpitAccess = hasDiscAdminAccess;

  logServerEvent("info", "disc_admin_route_access_checked", {
    route: "/admin/disc",
    userId: user.id,
    isAdmin: hasAdminAccess,
    isSiteAdmin: canAccessSiteAdmin(user),
    isDiscAdmin: Boolean(user.isDiscAdmin),
    allowed: hasCockpitAccess,
  });

  if (!hasCockpitAccess) {
    return <DiscAdminAccessDenied hasAdminAccess={hasAdminAccess} hasDiscAdminAccess={Boolean(user.isDiscAdmin)} />;
  }

  const params = searchParams ? await searchParams : undefined;
  const query = getSingleParam(params, "q")?.trim() ?? "";
  const status = getSingleParam(params, "status");
  const { users, companies, diagnostics } = await getDiscAdminDashboardData(query);

  return <DiscAdminCockpit query={query} status={status} users={users} companies={companies} diagnostics={diagnostics} basePath="/admin/disc" />;
}
