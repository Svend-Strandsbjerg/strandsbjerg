"use client";

import { useState, useTransition } from "react";

import { createFamilyEvent } from "@/app/familie/actions";

export function CreateEventForm() {
  const [dateOptions, setDateOptions] = useState([""]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await createFamilyEvent(formData);
            setDateOptions([""]);
            setMessage("Event created.");
          } catch {
            setMessage("Unable to create event. Check the form and try again.");
          }
        });
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input name="title" required minLength={3} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          required
          minLength={10}
          className="min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Location (optional)</label>
        <input name="location" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Candidate dates</p>
        {dateOptions.map((value, index) => (
          <input
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
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        ))}
        <button
          type="button"
          onClick={() => setDateOptions((prev) => [...prev, ""])}
          className="text-sm text-primary"
        >
          + Add another date option
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create event"}
      </button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
