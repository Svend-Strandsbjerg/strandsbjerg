import { notFound } from "next/navigation";

import { VoteForm } from "@/components/familie/vote-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FamilyPublicVotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const event = await prisma.familyEvent.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      location: true,
      shareToken: true,
      dateOptions: {
        orderBy: { candidateDate: "asc" },
        select: {
          id: true,
          candidateDate: true,
          _count: { select: { votes: true } },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tilmeld / stem</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
        <p className="text-sm text-muted-foreground">{event.location ? `Sted: ${event.location}` : "Sted: Ikke angivet"}</p>
      </header>

      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <VoteForm
          shareToken={event.shareToken}
          options={event.dateOptions.map((option) => ({
            id: option.id,
            candidateDate: option.candidateDate.toISOString(),
            votesCount: option._count.votes,
          }))}
        />
      </section>
    </div>
  );
}
