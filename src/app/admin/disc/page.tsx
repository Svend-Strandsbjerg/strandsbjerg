import { DiscAdminCockpit } from "@/components/admin/disc-admin-cockpit";
import { requireDiscAdmin } from "@/lib/access";
import { getDiscAdminDashboardData, getSingleParam } from "@/lib/admin/disc-admin";

export const dynamic = "force-dynamic";

type DiscAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDiscPage({ searchParams }: DiscAdminPageProps) {
  await requireDiscAdmin();
  const params = searchParams ? await searchParams : undefined;
  const query = getSingleParam(params, "q")?.trim() ?? "";
  const status = getSingleParam(params, "status");
  const { users, companies, diagnostics } = await getDiscAdminDashboardData(query);

  return <DiscAdminCockpit query={query} status={status} users={users} companies={companies} diagnostics={diagnostics} basePath="/admin/disc" />;
}
