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
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Familie planning</h1>
        <p className="text-sm text-muted-foreground">Private collaboration space for simple event planning and date voting.</p>
        <p className="text-xs text-muted-foreground">Logged in as {session?.user?.email ?? "unknown user"}</p>
      </header>

      <CreateEventForm />

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Events</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No events yet. Create the first one above.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/familie/events/${event.id}`}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Created by {event.createdBy.name ?? event.createdBy.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.dateOptions.length} date options</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
