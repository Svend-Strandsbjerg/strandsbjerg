"use client";

import { useState, useTransition } from "react";

import { submitFamilyPublicVote } from "@/app/x7k2p9q4v1m8/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VoteFormProps = {
  shareToken: string;
  options: {
    id: string;
    candidateDate: string;
    votesCount: number;
  }[];
};

export function VoteForm({ shareToken, options }: VoteFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await submitFamilyPublicVote(formData);
            setMessage("Tak. Din stemme er gemt.");
          } catch {
            setMessage("Kunne ikke gemme stemme. Udfyld navn og vælg mindst én dato.");
          }
        });
      }}
    >
      <input type="hidden" name="shareToken" value={shareToken} />

      <div className="space-y-1.5">
        <label htmlFor="participant-name" className="block text-sm font-medium">
          Deltagerens navn
        </label>
        <Input id="participant-name" name="participantName" required placeholder="Fx Anne" />
      </div>

      <p className="text-sm text-muted-foreground">Her kan vi komme</p>

      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/25 p-4 transition hover:bg-muted/40"
          >
            <input type="checkbox" name="dateOptionIds" value={option.id} className="mt-1 h-4 w-4" />
            <div>
              <p className="font-medium">{new Date(option.candidateDate).toLocaleString("da-DK")}</p>
              <p className="text-xs text-muted-foreground">{option.votesCount} svar</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Gemmer..." : "Tilmeld / stem"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
