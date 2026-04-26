import Link from "next/link";

import { CreateEventForm } from "@/components/familie/create-event-form";
import { requireFamilyAccessUser } from "@/lib/access";
import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PrivatePlanningPage() {
  const user = await requireFamilyAccessUser();

  const events = await prisma.familyEvent.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      dateOptions: {
        orderBy: { candidateDate: "asc" },
        include: { votes: true },
      },
      _count: {
        select: { votes: true },
      },
    },
  });

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Familie</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Planlæg familiens næste samling med forslag til datoer og et enkelt invitationslink.
        </p>
      </header>

      <CreateEventForm />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Kommende events</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Du har ingen events endnu. Opret dit første event for at komme i gang.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`${FAMILY_PRIVATE_BASE_PATH}/events/${event.id}`}
                className="block rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-primary/50 hover:bg-muted/20"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium tracking-tight">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.location ? `Sted: ${event.location}` : "Sted: Ikke angivet"}</p>
                    <p className="text-xs text-muted-foreground">
                      Mulige datoer: {event.dateOptions.map((option) => option.candidateDate.toLocaleString("da-DK")).join(" · ")}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <p>{event._count.votes} svar</p>
                    <p className="mt-1 underline">Åbn / administrer</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
