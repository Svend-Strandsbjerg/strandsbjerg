import { notFound } from "next/navigation";

import { CopyInviteLinkButton } from "@/components/familie/copy-invite-link-button";
import { requireFamilyAccessUser } from "@/lib/access";
import { FAMILY_PUBLIC_VOTE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FamilyEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFamilyAccessUser();

  const event = await prisma.familyEvent.findFirst({
    where: {
      id,
      createdById: user.id,
    },
    include: {
      dateOptions: {
        orderBy: { candidateDate: "asc" },
        include: {
          votes: {
            orderBy: { participantName: "asc" },
          },
        },
      },
      _count: { select: { votes: true } },
    },
  });

  if (!event) {
    notFound();
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${FAMILY_PUBLIC_VOTE_BASE_PATH}/${event.shareToken}`;
  const bestOption = [...event.dateOptions].sort((a, b) => b.votes.length - a.votes.length)[0] ?? null;

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        <p className="text-sm text-muted-foreground">{event.location ? `Sted: ${event.location}` : "Sted: Ikke angivet"}</p>
        <p className="text-sm text-muted-foreground">Samlede svar: {event._count.votes}</p>
        <CopyInviteLinkButton inviteLink={inviteLink} />
      </header>

      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Bedste dato</h2>
        {!bestOption ? (
          <p className="text-sm text-muted-foreground">Ingen datoer endnu.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {bestOption.candidateDate.toLocaleString("da-DK")} ({bestOption.votes.length} deltagere)
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Svar pr. dato</h2>
        {event.dateOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen mulige datoer er oprettet.</p>
        ) : (
          <div className="space-y-3">
            {event.dateOptions.map((option) => (
              <article key={option.id} className="rounded-2xl border border-border/80 bg-muted/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{option.candidateDate.toLocaleString("da-DK")}</h3>
                  <p className="text-xs text-muted-foreground">{option.votes.length} kan deltage</p>
                </div>
                {option.votes.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Ingen tilmeldinger endnu.</p>
                ) : (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {option.votes.map((vote) => (
                      <li key={vote.id}>• {vote.participantName}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
