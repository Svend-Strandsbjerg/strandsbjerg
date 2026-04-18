import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { InviteDiscClient } from "@/app/disc/invite/[token]/invite-disc-client";
import { auth } from "@/lib/auth";
import { DiscEngineError } from "@/lib/disc-engine";
import { persistDiscInviteContext } from "@/lib/disc-invite-context";
import { getInviteAccessState } from "@/lib/disc-invites";
import { getInviteDiscVersionEntitlements } from "@/lib/disc-version-entitlements";
import type { DiscVersionEntitlement } from "@/lib/disc-types";
import { logServerEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type InviteDiscPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

function inferOrigin(hostHeader: string | null) {
  if (!hostHeader) {
    return "http://localhost:3000";
  }

  const protocol = hostHeader.includes("localhost") ? "http" : "https";
  return `${protocol}://${hostHeader}`;
}

export default async function InviteDiscPage({ params }: InviteDiscPageProps) {
  const { token } = await params;
  const session = await auth();
  let versionEntitlements: DiscVersionEntitlement[] = [];
  let autoSelectedAssessmentVersionId: string | null = null;
  let versionDiscoveryError: string | null = null;

  await persistDiscInviteContext(token);

  if (!session?.user?.id) {
    redirect(`/disc/login?invite=${encodeURIComponent(token)}&next=${encodeURIComponent(`/disc/invite/${token}`)}`);
  }

  const requestHeaders = await headers();
  const invite = await prisma.assessmentInvite.findUnique({
    where: { token },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          resultShare: {
            select: {
              token: true,
            },
          },
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const latestAssessment = invite.assessments[0] ?? null;
  const inviteState = getInviteAccessState(invite.status, invite.expiresAt);
  const origin = inferOrigin(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"));

  if (inviteState === "invalidated") {
    logServerEvent("warn", "disc_invite_route_blocked", { inviteToken: token, state: inviteState });
    notFound();
  }

  if (inviteState === "expired") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">DISC invitation er udløbet</h1>
        <p className="text-sm text-muted-foreground">Linket er ikke længere aktivt. Kontakt virksomheden og bed om en ny invitation.</p>
      </div>
    );
  }

  try {
    const resolution = await getInviteDiscVersionEntitlements({
      user: { id: session.user.id, role: session.user.role ?? "USER" },
      inviteToken: token,
      companyId: invite.companyId,
    });
    versionEntitlements = resolution.visibleEntitlements;
    autoSelectedAssessmentVersionId = resolution.autoSelectedAssessmentVersionId;
  } catch (error) {
    versionDiscoveryError = error instanceof DiscEngineError ? error.message : "Kunne ikke hente DISC-versioner lige nu.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Inviteret DISC-test</h1>
        <p className="text-sm text-muted-foreground">
          Du er inviteret til en DISC-vurdering{invite.company?.name ? ` af ${invite.company.name}` : ""}.
        </p>
      </div>

      <section className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sådan fungerer det</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>1. Gennemfør testen fra denne invitation.</li>
          <li>2. Resultatet gemmes i dit personlige DISC-overblik.</li>
          <li>3. Den inviterende virksomhed kan også se resultatet på kandidaten.</li>
        </ol>
        {invite.createdByUser?.name || invite.createdByUser?.email ? (
          <p className="mt-3 text-xs text-muted-foreground">Invitation oprettet af {invite.createdByUser.name ?? invite.createdByUser.email}.</p>
        ) : null}
      </section>

      <InviteDiscClient
        token={token}
        versionEntitlements={versionEntitlements}
        autoSelectedAssessmentVersionId={autoSelectedAssessmentVersionId}
        versionDiscoveryError={versionDiscoveryError}
        inviteState={inviteState}
        candidateLabel={invite.candidateName ?? invite.candidateEmail ?? "kandidat"}
        companyLabel={invite.company?.name ?? null}
        latestAssessment={
          latestAssessment
            ? {
                id: latestAssessment.id,
                status: latestAssessment.status,
                createdAt: latestAssessment.createdAt,
                submittedAt: latestAssessment.submittedAt,
                externalSessionId: latestAssessment.externalSessionId,
                rawResponses: latestAssessment.rawResponses,
                resultLink: latestAssessment.resultShare ? `${origin}/disc/result/${latestAssessment.resultShare.token}` : null,
              }
            : null
        }
      />
    </div>
  );
}
