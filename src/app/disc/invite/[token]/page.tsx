import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { InviteDiscClient } from "@/app/disc/invite/[token]/invite-disc-client";
import { getInviteAccessState } from "@/lib/disc-invites";
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
  const requestHeaders = await headers();
  const invite = await prisma.assessmentInvite.findUnique({
    where: { token },
    include: {
      company: {
        select: {
          name: true,
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Candidate DISC assessment</h1>
        {invite.company?.name ? (
          <p className="text-sm text-muted-foreground">You have been invited by {invite.company.name}.</p>
        ) : null}
        <p className="text-sm text-muted-foreground">Complete the invited DISC assessment and review your result.</p>
      </div>

      <InviteDiscClient
        token={token}
        inviteState={inviteState}
        candidateLabel={invite.candidateName ?? invite.candidateEmail ?? "candidate"}
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
