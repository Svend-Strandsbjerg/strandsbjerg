import Link from "next/link";

import { auth, signIn, signOut } from "@/lib/auth";
import { PUBLIC_NAV_ITEMS } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          STRANDSBJERG
        </Link>

        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <Link href="/familie" className="transition hover:text-foreground">
            Familie
          </Link>
          <ThemeToggle />
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-xs">
                Sign out
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn();
              }}
            >
              <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-xs">
                Login
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
