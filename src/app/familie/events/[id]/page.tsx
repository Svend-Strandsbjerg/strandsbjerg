import { notFound } from "next/navigation";

import { VoteForm } from "@/components/familie/vote-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FamilyEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

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
      .filter((option) => option.votes.some((vote) => vote.userId === session?.user?.id))
      .map((option) => option.id) ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-2 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-3xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        {event.location ? <p className="text-sm text-muted-foreground">Location: {event.location}</p> : null}
        <p className="text-xs text-muted-foreground">Created by {event.createdBy.name ?? event.createdBy.email}</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-medium">Vote on possible dates</h2>
        <VoteForm
          eventId={event.id}
          selectedOptionIds={selectedOptionIds}
          options={event.dateOptions.map((option) => ({
            id: option.id,
            candidateDate: option.candidateDate.toISOString(),
            votes: option.votes,
          }))}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-medium">Voting results</h2>
        {event.dateOptions.map((option) => (
          <article key={option.id} className="rounded-xl border border-border p-4">
            <h3 className="font-medium">{option.candidateDate.toLocaleString()}</h3>
            {option.votes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No votes yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {option.votes.map((vote) => (
                  <li key={vote.id}>• {vote.user.name ?? vote.user.email}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
