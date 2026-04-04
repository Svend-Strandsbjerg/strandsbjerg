import { AdminEditor } from "@/app/admin/admin-editor";
import { requireAdmin } from "@/lib/access";
import { getHomeContent, getProfessionalContent } from "@/lib/content";

export default async function AdminPage() {
  await requireAdmin();
  const homeContent = await getHomeContent();
  const professionalContent = await getProfessionalContent();

  return <AdminEditor homeContent={homeContent} professionalContent={professionalContent} />;
}
