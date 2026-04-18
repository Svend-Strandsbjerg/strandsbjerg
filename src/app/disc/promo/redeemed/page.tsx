import Link from "next/link";
import { redirect } from "next/navigation";

import { DiscVersionSelector } from "@/components/disc/disc-version-selector";
import { auth } from "@/lib/auth";
import { readDiscPromoRedemptionContext } from "@/lib/disc-promo-context";
import { DiscEngineError } from "@/lib/disc-engine";
import { getPersonalDiscVersionEntitlements } from "@/lib/disc-version-entitlements";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type PromoRedeemedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStateParam(params: Record<string, string | string[] | undefined> | undefined) {
  const value = params?.state;
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

export default async function PromoRedeemedPage({ searchParams }: PromoRedeemedPageProps) {
  const session = await auth();
  const params = searchParams ? await searchParams : undefined;
  const sourceState = getStateParam(params);

  if (!session?.user?.id) {
    redirect("/disc/login?next=/disc/promo/redeemed");
  }

  const redemptionId = await readDiscPromoRedemptionContext();
  if (!redemptionId) {
    redirect("/disc/overview");
  }

  const redemption = await prisma.discPromoRedemption.findUnique({
    where: { id: redemptionId },
    select: {
      id: true,
      userId: true,
      grantedCredits: true,
      consumedCredits: true,
      promoLink: {
        select: {
          id: true,
          label: true,
          active: true,
        },
      },
    },
  });

  if (!redemption || redemption.userId !== session.user.id || !redemption.promoLink.active) {
    redirect("/disc/overview?promo=used");
  }

  const remainingCredits = Math.max(0, redemption.grantedCredits - redemption.consumedCredits);
  if (remainingCredits <= 0) {
    redirect("/disc/overview?promo=used");
  }

  let versionDiscoveryError: string | null = null;
  let selectableCount = 0;
  let autoSelectedAssessmentVersionId: string | null = null;
  let visibleEntitlements = [] as Awaited<ReturnType<typeof getPersonalDiscVersionEntitlements>>["visibleEntitlements"];

  try {
    const resolution = await getPersonalDiscVersionEntitlements({
      user: { id: session.user.id, role: session.user.role ?? "USER" },
    });

    visibleEntitlements = resolution.visibleEntitlements;
    selectableCount = resolution.selectableEntitlements.length;
    autoSelectedAssessmentVersionId = resolution.autoSelectedAssessmentVersionId;
  } catch (error) {
    versionDiscoveryError = error instanceof DiscEngineError ? error.message : "Unable to load DISC assessment versions right now.";
  }

  logServerEvent("info", "disc_promo_onboarding_view", {
    userId: session.user.id,
    promoLinkId: redemption.promoLink.id,
    promoRedemptionId: redemption.id,
    remainingCredits,
    sourceState: sourceState ?? null,
    selectableCount,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">DISC promo activated</p>
        <h1 className="text-3xl font-semibold tracking-tight">{sourceState === "already" ? "Din kampagnekredit er stadig aktiv" : "Din gratis DISC-kredit er klar"}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Kampagnen <span className="font-medium text-foreground">{redemption.promoLink.label}</span> er knyttet til din konto. Du har <span className="font-medium text-foreground">{remainingCredits} DISC-kredit</span> klar til brug.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Næste trin</h2>
        <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>1. Vælg DISC-version i flowet nedenfor.</li>
          <li>2. Start assessment — krediten trækkes ved sessionstart.</li>
          <li>3. Se resultatet i dit DISC-overblik.</li>
        </ol>
      </div>

      {versionDiscoveryError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{versionDiscoveryError}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Tilgængelige DISC-versioner</h2>
            <p className="text-xs text-muted-foreground">
              {selectableCount === 1 ? "Én version er klar (auto-valgt)" : `${selectableCount} valgbare versioner`}
            </p>
          </div>
          <DiscVersionSelector
            entitlements={visibleEntitlements}
            selectedVersionId={autoSelectedAssessmentVersionId ?? ""}
            onSelect={() => {
              void 0;
            }}
            disabled
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/disc/overview?promo=ready" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Fortsæt til assessment-start
        </Link>
        <Link href="/disc" className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium">
          Til DISC-forsiden
        </Link>
      </div>
    </div>
  );
}
