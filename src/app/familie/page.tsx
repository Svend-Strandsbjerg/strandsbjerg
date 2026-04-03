import Link from "next/link";

import { CreateEventForm } from "@/components/familie/create-event-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FamiliePage() {
  const session = await auth();

  const events = await prisma.familyEvent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      dateOptions: {
        include: { votes: true },
      },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Familie planning</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Private collaboration space for simple event planning and date voting.
        </p>
        <p className="text-xs text-muted-foreground">Logged in as {session?.user?.email ?? "unknown user"}</p>
      </header>

      <CreateEventForm />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Events</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No events yet. Create the first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const voteCount = event.dateOptions.reduce((sum, option) => sum + option.votes.length, 0);

              return (
                <Link
                  key={event.id}
                  href={`/familie/events/${event.id}`}
                  className="block rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-primary/50 hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium tracking-tight">{event.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">Created by {event.createdBy.name ?? event.createdBy.email}</p>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      <p>{event.dateOptions.length} date option(s)</p>
                      <p className="mt-1">{voteCount} total vote(s)</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
