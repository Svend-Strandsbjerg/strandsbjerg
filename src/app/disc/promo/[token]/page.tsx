import Link from "next/link";
import { redirect } from "next/navigation";
import { DiscTierAccess } from "@prisma/client";

import { auth } from "@/lib/auth";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { clearDiscPromoTokenContext, persistDiscPromoRedemptionContext, persistDiscPromoTokenContext } from "@/lib/disc-promo-context";
import { getDiscPromoLinkState, redeemDiscPromoLink } from "@/lib/disc-promo";

export const dynamic = "force-dynamic";

type DiscPromoPageProps = {
  params: Promise<{ token: string }>;
};

export default async function DiscPromoPage({ params }: DiscPromoPageProps) {
  const { token } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await persistDiscPromoTokenContext(token);

  const promoLink = await prisma.discPromoLink.findUnique({
    where: { token },
    select: {
      id: true,
      label: true,
      grantTier: true,
      grantCredits: true,
      active: true,
      expiresAt: true,
      maxRedemptions: true,
      totalRedemptions: true,
    },
  });
  const promoLinkState = promoLink ? getDiscPromoLinkState(promoLink) : "invalid";
  logServerEvent("info", "disc_promo_landing_visit", {
    promoToken: token,
    promoLinkId: promoLink?.id ?? null,
    promoLinkState,
    authenticated: Boolean(userId),
  });

  const label = promoLink?.label ?? "DISC free profile";
  const tierCopy =
    promoLink?.grantTier === DiscTierAccess.DEEP
      ? "Deep-tier kampagneadgang"
      : promoLink?.grantTier === DiscTierAccess.STANDARD
        ? "Standard-tier kampagneadgang"
        : "Free-tier kampagneadgang";

  if (!promoLink) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">DISC by Strandsbjerg</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Dette tilbud er ikke længere tilgængeligt</h1>
        <p className="mt-2 text-sm text-muted-foreground">Linket er ugyldigt eller er blevet fjernet. Bed afsenderen om et opdateret DISC-link.</p>
      </div>
    );
  }

  if (!session?.user?.id) {
    logServerEvent("info", "disc_promo_auth_redirect_context_ready", {
      promoLinkId: promoLink.id,
      promoToken: token,
      flow: "landing_prompt",
    });

    return (
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">DISC by Strandsbjerg</p>
          <h1 className="text-3xl font-semibold tracking-tight">Få en gratis DISC-profil</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Du har fået adgang til kampagnen <span className="font-medium text-foreground">{label}</span>. Opret konto eller log ind for at redeem din gratis DISC-kredit.
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tilbud</p>
            <p className="mt-1 text-sm font-medium">{promoLink.grantCredits} gratis DISC-kredit</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Adgang</p>
            <p className="mt-1 text-sm font-medium">{tierCopy}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Konto</p>
            <p className="mt-1 text-sm font-medium">Kredit knyttes til din bruger</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/disc/signup?promo=${encodeURIComponent(token)}&next=${encodeURIComponent(`/disc/promo/${token}`)}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Opret konto og fortsæt
          </Link>
          <Link
            href={`/disc/login?promo=${encodeURIComponent(token)}&next=${encodeURIComponent(`/disc/promo/${token}`)}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
          >
            Jeg har allerede en konto
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">Når du er logget ind, validerer vi automatisk linket og fører dig videre til din DISC-start.</p>
      </div>
    );
  }

  const result = await redeemDiscPromoLink({ token, userId: session.user.id });

  if (result.status === "invalid") {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">DISC by Strandsbjerg</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Dette tilbud er ikke gyldigt</h1>
        <p className="mt-2 text-sm text-muted-foreground">Linket kan ikke bruges. Bed afsenderen om et nyt kampagnelink.</p>
      </div>
    );
  }

  if (result.status === "inactive" || result.status === "expired" || result.status === "exhausted") {
    const message =
      result.status === "inactive"
        ? "Kampagnen er midlertidigt deaktiveret."
        : result.status === "expired"
          ? "Kampagnen er udløbet."
          : "Kampagnen har nået sin maksimale mængde redemptions.";

    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">DISC by Strandsbjerg</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Tilbuddet er lukket</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (result.status === "error" || !result.redemption || !result.link) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-destructive/30 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Vi kunne ikke aktivere dit tilbud</h1>
        <p className="mt-2 text-sm text-muted-foreground">Prøv igen om lidt. Hvis problemet fortsætter, bed afsenderen om et nyt link.</p>
      </div>
    );
  }

  const remainingCredits = Math.max(0, result.redemption.grantedCredits - result.redemption.consumedCredits);
  await persistDiscPromoRedemptionContext(result.redemption.id);
  await clearDiscPromoTokenContext();

  if (remainingCredits > 0) {
    logServerEvent("info", "disc_promo_redeem_onboarding_redirect", {
      promoLinkId: result.link.id,
      userId: session.user.id,
      outcome: result.status,
      remainingCredits,
    });
    redirect(`/disc/promo/redeemed?state=${result.status === "already_redeemed" ? "already" : "new"}`);
  }

  logServerEvent("info", "disc_promo_duplicate_without_credit_redirect", {
    promoLinkId: result.link.id,
    userId: session.user.id,
    outcome: result.status,
    remainingCredits,
  });
  redirect("/disc/overview?promo=used");
}
