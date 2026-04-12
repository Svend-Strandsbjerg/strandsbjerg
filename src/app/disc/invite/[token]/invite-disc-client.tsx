"use client";

import { useActionState, useMemo } from "react";

import {
  initialInviteDiscState,
  startInviteDiscAssessment,
  submitInviteDiscAssessment,
} from "@/app/disc/invite/[token]/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InviteDiscClientProps = {
  token: string;
  candidateLabel: string;
  inviteState: "active" | "expired" | "invalidated" | "completed";
  latestAssessment: {
    status: "STARTED" | "SUBMITTED" | "FAILED";
    createdAt: Date;
    submittedAt: Date | null;
    externalSessionId: string;
    rawResponses: unknown;
  } | null;
};

export function InviteDiscClient({ token, candidateLabel, inviteState, latestAssessment }: InviteDiscClientProps) {
  const [startState, startAction, starting] = useActionState(startInviteDiscAssessment, initialInviteDiscState);
  const [submitState, submitAction, submitting] = useActionState(submitInviteDiscAssessment, initialInviteDiscState);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const hasStartedSession = Boolean(currentSessionId);
  const submissionSucceeded = submitState.status === "success";

  if (inviteState === "completed" && latestAssessment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-700">Assessment completed for {candidateLabel}.</p>
        <DiscResultPresentation
          title="Candidate DISC result"
          status={latestAssessment.status}
          createdAt={latestAssessment.createdAt}
          submittedAt={latestAssessment.submittedAt}
          rawResponses={latestAssessment.rawResponses}
          externalSessionId={latestAssessment.externalSessionId}
          identityLabel={candidateLabel}
          emptyMessage="This invite was completed, but the result payload is incomplete."
        />
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
