import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { auth, signIn, signOut } from "@/lib/auth";
import { PUBLIC_NAV_ITEMS } from "@/lib/utils";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xs font-semibold tracking-[0.16em] sm:text-sm">
          STRANDSBJERG
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground sm:gap-5 sm:text-sm">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
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
