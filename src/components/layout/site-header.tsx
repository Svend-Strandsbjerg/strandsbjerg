import Link from "next/link";

import { PublicContainer } from "@/components/layout/public-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopNavItemButton, TopNavItemLink } from "@/components/layout/top-nav-item";
import { canAccessAdmin, canAccessFamily, canAccessInvestments } from "@/lib/access";
import { auth, signIn, signOut } from "@/lib/auth";
import { isEditModeEnabled } from "@/lib/edit-mode";
import { FAMILY_PRIVATE_BASE_PATH, INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { PUBLIC_NAV_ITEMS } from "@/lib/utils";

export async function SiteHeader() {
  const session = await auth();
  const editModeEnabled = isEditModeEnabled();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <PublicContainer className="flex w-full flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/" className="text-xs font-semibold tracking-[0.16em] sm:text-sm">
          STRANDSBJERG
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <TopNavItemLink key={item.href} href={item.href}>
              {item.label}
            </TopNavItemLink>
          ))}
          {session?.user ? <TopNavItemLink href="/account">My User</TopNavItemLink> : null}
          {canAccessFamily(session?.user) ? <TopNavItemLink href={FAMILY_PRIVATE_BASE_PATH}>Family</TopNavItemLink> : null}
          {canAccessInvestments(session?.user) ? <TopNavItemLink href={INVESTMENTS_PRIVATE_BASE_PATH}>Investments</TopNavItemLink> : null}
          {!editModeEnabled && canAccessAdmin(session?.user) ? <TopNavItemLink href="/admin">Admin</TopNavItemLink> : null}
          {editModeEnabled ? <TopNavItemLink href="/admin">Edit</TopNavItemLink> : null}
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
      </PublicContainer>
    </header>
  );
}
