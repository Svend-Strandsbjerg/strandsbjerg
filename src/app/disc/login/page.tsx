import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import { persistDiscInviteContext } from "@/lib/disc-invite-context";
import { persistDiscPromoTokenContext } from "@/lib/disc-promo-context";
import { logServerEvent } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DiscLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const loginErrors: Record<string, string> = {
  invalid_credentials: "Forkert e-mail eller adgangskode.",
  pending_approval: "Din konto er ikke klar endnu. Kontakt support.",
  rejected_account: "Din konto har ikke adgang.",
};

function getSingleParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscLoginPage({ searchParams }: DiscLoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await auth();
  const inviteToken = getSingleParam(params, "invite")?.trim();
  const promoToken = getSingleParam(params, "promo")?.trim();
  const nextPath = getSingleParam(params, "next")?.trim() || "/disc/overview";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/disc/overview";
  const authErrorKey = getSingleParam(params, "error");

  if (inviteToken) {
    await persistDiscInviteContext(inviteToken);
  }
  if (promoToken) {
    await persistDiscPromoTokenContext(promoToken);
    logServerEvent("info", "disc_promo_auth_redirect_context_ready", {
      promoToken,
      flow: "login_page",
    });
  }

  if (session?.user?.id) {
    redirect(safeNextPath as never);
  }

  const credentialsSignIn = async (formData: FormData) => {
    "use server";

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const callbackTarget = String(formData.get("next") ?? "/disc/overview");
    const invite = String(formData.get("invite") ?? "").trim();
    const promo = String(formData.get("promo") ?? "").trim();

    if (invite) {
      await persistDiscInviteContext(invite);
    }
    if (promo) {
      await persistDiscPromoTokenContext(promo);
      logServerEvent("info", "disc_promo_auth_redirect_context_ready", {
        promoToken: promo,
        flow: "login_submit",
      });
    }

    if (!email || !password) {
      redirect(`/disc/login?error=invalid_credentials&next=${encodeURIComponent(callbackTarget)}`);
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: callbackTarget,
      });
    } catch (error) {
      if (error instanceof AuthError && error.type === "CredentialsSignin") {
        redirect(`/disc/login?error=invalid_credentials&next=${encodeURIComponent(callbackTarget)}`);
      }

      throw error;
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Log ind til DISC</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Log ind for at tage testen, se egne resultater eller fortsætte en invitation.</p>
      </div>

      {inviteToken ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Invitation registreret. Log ind for at fortsætte.</p> : null}
      {promoToken ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">Promo-link registreret. Log ind for at redeem din gratis DISC.</p> : null}

      {authErrorKey && loginErrors[authErrorKey] ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{loginErrors[authErrorKey]}</p>
      ) : null}

      <form action={credentialsSignIn} className="space-y-3">
        <input type="hidden" name="next" value={safeNextPath} />
        <input type="hidden" name="invite" value={inviteToken ?? ""} />
        <input type="hidden" name="promo" value={promoToken ?? ""} />
        <Input type="email" name="email" required placeholder="you@example.com" autoComplete="email" />
        <Input type="password" name="password" required placeholder="Password" autoComplete="current-password" />
        <Button className="w-full">Log ind</Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Har du ikke en konto?{" "}
        <Link
          href={`/disc/signup?next=${encodeURIComponent(safeNextPath)}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}${promoToken ? `&promo=${encodeURIComponent(promoToken)}` : ""}`}
          className="underline-offset-4 hover:underline"
        >
          Opret bruger
        </Link>
      </p>
    </div>
  );
}
