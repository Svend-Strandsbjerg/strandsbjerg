import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminWorkspaceNav, type AdminWorkspaceNavItem } from "@/components/admin/admin-workspace-nav";
import { canAccessAdmin, canAccessAdminCockpit, canAccessDiscAdmin, canAccessSiteAdmin, requireUser } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (!canAccessAdminCockpit(user)) {
    return (
      <AdminAccessDenied
        title="Ingen adgang til administration"
        message="Du har ikke en administrativ rolle. Kontakt en generel admin for at få tildelt de nødvendige rettigheder."
      />
    );
  }

  const items: AdminWorkspaceNavItem[] = [{ href: "/admin", label: "Admin" }];

  if (canAccessAdmin(user)) {
    items.push({ href: "/admin/users", label: "Brugere" });
  }

  if (canAccessSiteAdmin(user)) {
    items.push({ href: "/admin/site", label: "Site" });
  }

  if (canAccessDiscAdmin(user)) {
    items.push({ href: "/admin/disc", label: "DISC" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Admin-arbejdsområde med direkte navigation mellem de områder, du har adgang til.</p>
        <AdminWorkspaceNav items={items} />
      </section>

      {children}
    </div>
  );
}
