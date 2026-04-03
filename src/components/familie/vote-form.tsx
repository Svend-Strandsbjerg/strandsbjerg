"use client";

import { useState, useTransition } from "react";

import { voteForEvent } from "@/app/familie/actions";
import { Button } from "@/components/ui/button";

type VoteFormProps = {
  eventId: string;
  options: {
    id: string;
    candidateDate: string;
    votes: { user: { name: string | null; email: string | null } }[];
  }[];
  selectedOptionIds: string[];
};

export function VoteForm({ eventId, options, selectedOptionIds }: VoteFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await voteForEvent(formData);
            setMessage("Vote saved.");
          } catch {
            setMessage("Unable to save vote. Please select at least one date.");
          }
        });
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />

      <p className="text-sm text-muted-foreground">Choose one or more options that work for you.</p>

      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/25 p-4 transition hover:bg-muted/40"
          >
            <input
              type="checkbox"
              name="dateOptionIds"
              value={option.id}
              defaultChecked={selectedOptionIds.includes(option.id)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <p className="font-medium">{new Date(option.candidateDate).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{option.votes.length} vote(s)</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save vote"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
