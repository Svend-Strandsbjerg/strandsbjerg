"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialDiscSignupActionState, registerDiscUser } from "@/app/disc/signup/actions";

export default function DiscSignupPage() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const promoToken = searchParams.get("promo") ?? "";
  const nextPath = searchParams.get("next") ?? "/disc/overview";
  const [state, action, pending] = useActionState(registerDiscUser, initialDiscSignupActionState);

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Opret DISC-konto</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Opret konto og kom direkte videre til DISC-flowet.</p>
      </div>

      {inviteToken ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Invitation registreret. Opret dig for at fortsætte.</p> : null}
      {promoToken ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">Promo-link registreret. Opret dig for at få din gratis DISC.</p> : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="invite" value={inviteToken} />
        <input type="hidden" name="promo" value={promoToken} />
        <Input name="name" placeholder="Navn (valgfrit)" />
        <Input type="email" name="email" required placeholder="you@example.com" />
        <Input type="password" name="password" required minLength={8} placeholder="Lav en adgangskode" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Opretter konto..." : "Opret konto"}
        </Button>
      </form>

      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <p className="text-center text-xs text-muted-foreground">
        Har du allerede en konto?{" "}
        <Link
          href={`/disc/login?next=${encodeURIComponent(nextPath)}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}${promoToken ? `&promo=${encodeURIComponent(promoToken)}` : ""}`}
          className="underline-offset-4 hover:underline"
        >
          Log ind
        </Link>
      </p>
    </div>
  );
}
