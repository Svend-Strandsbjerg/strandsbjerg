"use client";

import { useState, useTransition } from "react";

import { createFamilyEvent } from "@/app/x7k2p9q4v1m8/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateEventForm() {
  const [dateOptions, setDateOptions] = useState([""]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7"
      action={(formData) => {
        setFeedback(null);
        startTransition(async () => {
          try {
            await createFamilyEvent(formData);
            setDateOptions([""]);
            setFeedback({ type: "success", message: "Event er oprettet." });
          } catch {
            setFeedback({ type: "error", message: "Kunne ikke oprette event. Tjek felterne og prøv igen." });
          }
        });
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight">Opret event</h2>

      <div className="space-y-1.5">
        <label htmlFor="event-title" className="block text-sm font-medium">
          Navn på event
        </label>
        <Input id="event-title" name="title" required minLength={2} placeholder="Fx Sommerhygge hos mormor" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="event-location" className="block text-sm font-medium">
          Sted
        </label>
        <Input id="event-location" name="location" placeholder="Fx Odense" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Mulige datoer</p>

        <div className="space-y-2">
          {dateOptions.map((value, index) => (
            <Input
              key={index}
              type="datetime-local"
              name="dateOptions"
              value={value}
              onChange={(event) => {
                const next = [...dateOptions];
                next[index] = event.target.value;
                setDateOptions(next);
              }}
              required
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setDateOptions((prev) => [...prev, ""])}
          className="text-sm font-medium text-primary hover:underline"
        >
          + Tilføj dato/tid
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Opretter..." : "Opret event"}
        </Button>
        {feedback ? (
          <p className={`text-sm ${feedback.type === "success" ? "text-foreground" : "text-primary"}`}>{feedback.message}</p>
        ) : null}
      </div>
    </form>
  );
}
