"use client";

import { useTransition } from "react";

import { voteForEvent } from "@/app/familie/actions";

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

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          await voteForEvent(formData);
        });
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />

      <div className="space-y-3">
        {options.map((option) => (
          <label key={option.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <input
              type="checkbox"
              name="dateOptionIds"
              value={option.id}
              defaultChecked={selectedOptionIds.includes(option.id)}
              className="mt-1"
            />
            <div>
              <p className="font-medium">{new Date(option.candidateDate).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Votes: {option.votes.length}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save vote"}
      </button>
    </form>
  );
}
