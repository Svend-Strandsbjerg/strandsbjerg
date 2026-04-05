import { AdminEditor } from "@/app/admin/admin-editor";
import { requireAdmin } from "@/lib/access";
import { getHomeContent, getProfessionalContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const adminUser = await requireAdmin(searchParams ? await searchParams : undefined);
  const homeContent = await getHomeContent();
  const professionalContent = await getProfessionalContent();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      approvalStatus: true,
      createdAt: true,
    },
  });

  return <AdminEditor homeContent={homeContent} professionalContent={professionalContent} users={users} currentAdminUserId={adminUser?.id} />;
}
