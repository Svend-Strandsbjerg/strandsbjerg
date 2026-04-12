"use client";

import { useActionState, useMemo } from "react";

import {
  initialInviteDiscState,
  startInviteDiscAssessment,
  submitInviteDiscAssessment,
} from "@/app/disc/invite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InviteDiscClientProps = {
  token: string;
  candidateLabel: string;
  inviteState: "active" | "expired" | "invalidated" | "completed";
  submittedResponses: unknown[] | null;
};

export function InviteDiscClient({ token, candidateLabel, inviteState, submittedResponses }: InviteDiscClientProps) {
  const [startState, startAction, starting] = useActionState(startInviteDiscAssessment, initialInviteDiscState);
  const [submitState, submitAction, submitting] = useActionState(submitInviteDiscAssessment, initialInviteDiscState);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const hasStartedSession = Boolean(currentSessionId);
  const submissionSucceeded = submitState.status === "success";

  if (inviteState === "completed" && submittedResponses) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-700">Assessment completed for {candidateLabel}.</p>
        <pre className="overflow-auto rounded-xl border border-border/80 bg-muted/30 p-4 text-xs">{JSON.stringify(submittedResponses, null, 2)}</pre>
      </div>
    );
  }

  if (inviteState === "completed") {
    return <p className="text-sm text-muted-foreground">This invite has already been completed.</p>;
  }

  if (inviteState === "expired") {
    return <p className="text-sm text-destructive">This invite has expired. Please request a new invite.</p>;
  }

  if (inviteState === "invalidated") {
    return <p className="text-sm text-destructive">This invite was invalidated by the company.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Invite for {candidateLabel}. Start and submit your DISC assessment below.</p>

      <form action={startAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" disabled={starting || hasStartedSession}>
          {starting ? "Starting session..." : hasStartedSession ? "Session active" : "Start DISC session"}
        </Button>
      </form>

      {startState.status !== "idle" ? (
        <p className={startState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{startState.message}</p>
      ) : null}

      <form action={submitAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="sessionId" value={currentSessionId} />
        <label className="block text-sm font-medium" htmlFor="responses">
          Responses JSON array
        </label>
        <Textarea id="responses" name="responses" className="min-h-36" placeholder='[{"questionId":"q1","value":"A"}]' required />
        <Button type="submit" disabled={submitting || !hasStartedSession || submissionSucceeded}>
          {submitting ? "Submitting..." : submissionSucceeded ? "Submitted" : "Submit responses"}
        </Button>
      </form>

      {submitState.status !== "idle" ? (
        <p className={submitState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{submitState.message}</p>
      ) : null}
    </div>
  );
}
