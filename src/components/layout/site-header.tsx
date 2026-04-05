import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopNavItemButton, TopNavItemLink } from "@/components/layout/top-nav-item";
import { isApprovedFamilyUser } from "@/lib/access";
import { auth, signIn, signOut } from "@/lib/auth";
import { isEditModeEnabled } from "@/lib/edit-mode";
import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { PUBLIC_NAV_ITEMS } from "@/lib/utils";

export async function SiteHeader() {
  const session = await auth();
  const editModeEnabled = isEditModeEnabled();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="site-container flex w-full flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/" className="text-xs font-semibold tracking-[0.16em] sm:text-sm">
          STRANDSBJERG
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <TopNavItemLink key={item.href} href={item.href}>
              {item.label}
            </TopNavItemLink>
          ))}
          {isApprovedFamilyUser(session?.user) ? <TopNavItemLink href={FAMILY_PRIVATE_BASE_PATH}>Family</TopNavItemLink> : null}
          {editModeEnabled ? (
            <TopNavItemLink href="/admin">Edit</TopNavItemLink>
          ) : null}
          <ThemeToggle />
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <TopNavItemButton type="submit">Sign out</TopNavItemButton>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn();
              }}
            >
              <TopNavItemButton type="submit">Login</TopNavItemButton>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
