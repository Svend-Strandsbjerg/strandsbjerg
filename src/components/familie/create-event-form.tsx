"use client";

import { useState, useTransition } from "react";

import { createFamilyEvent } from "@/app/x7k2p9q4v1m8/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
            setFeedback({ type: "success", message: "Event created successfully." });
          } catch {
            setFeedback({ type: "error", message: "Unable to create event. Check required fields and try again." });
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="event-title" className="block text-sm font-medium">
          Event title
        </label>
        <Input id="event-title" name="title" required minLength={3} placeholder="e.g. Summer weekend planning" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="event-description" className="block text-sm font-medium">
          Short description
        </label>
        <Textarea
          id="event-description"
          name="description"
          required
          minLength={10}
          placeholder="Describe what the event is about and any relevant context."
          className="min-h-24"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="event-location" className="block text-sm font-medium">
          Location (optional)
        </label>
        <Input id="event-location" name="location" placeholder="e.g. Copenhagen" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Candidate dates</p>
        <p className="text-xs text-muted-foreground">Add one or more options family members can vote for.</p>

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
          + Add another date option
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create event"}
        </Button>
        {feedback ? (
          <p className={`text-sm ${feedback.type === "success" ? "text-foreground" : "text-primary"}`}>{feedback.message}</p>
        ) : null}
      </div>
    </form>
  );
}
