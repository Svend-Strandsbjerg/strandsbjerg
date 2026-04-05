import { notFound } from "next/navigation";

import { VoteForm } from "@/components/familie/vote-form";
import { requireApprovedFamilyUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function FamilyEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireApprovedFamilyUser();

  const event = await prisma.familyEvent.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      dateOptions: {
        orderBy: { candidateDate: "asc" },
        include: {
          votes: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const selectedOptionIds =
    event.dateOptions
      .filter((option) => option.votes.some((vote) => vote.userId === user.id))
      .map((option) => option.id) ?? [];

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{event.description}</p>
        {event.location ? <p className="text-sm text-muted-foreground">Location: {event.location}</p> : null}
        <p className="text-xs text-muted-foreground">Created by {event.createdBy.name ?? event.createdBy.email}</p>
      </header>

      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Vote on possible dates</h2>
        {event.dateOptions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No candidate dates are available yet.
          </p>
        ) : (
          <VoteForm
            eventId={event.id}
            selectedOptionIds={selectedOptionIds}
            options={event.dateOptions.map((option) => ({
              id: option.id,
              candidateDate: option.candidateDate.toISOString(),
              votes: option.votes,
            }))}
          />
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Voting results</h2>
        {event.dateOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results to display yet.</p>
        ) : (
          <div className="space-y-3">
            {event.dateOptions.map((option) => (
              <article key={option.id} className="rounded-2xl border border-border/80 bg-muted/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{option.candidateDate.toLocaleString()}</h3>
                  <p className="text-xs text-muted-foreground">{option.votes.length} vote(s)</p>
                </div>
                {option.votes.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No votes yet.</p>
                ) : (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {option.votes.map((vote) => (
                      <li key={vote.id}>• {vote.user.name ?? vote.user.email}</li>
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
