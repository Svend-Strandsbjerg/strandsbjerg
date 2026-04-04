import { AdminEditor } from "@/app/admin/admin-editor";
import { requireAdmin } from "@/lib/access";
import { getHomeContent, getProfessionalContent } from "@/lib/content";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin(searchParams ? await searchParams : undefined);
  const homeContent = await getHomeContent();
  const professionalContent = await getProfessionalContent();

  return <AdminEditor homeContent={homeContent} professionalContent={professionalContent} />;
}
