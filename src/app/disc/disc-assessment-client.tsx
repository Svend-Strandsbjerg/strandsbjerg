"use client";

import { useActionState, useMemo } from "react";

import {
  initialDiscFlowState,
  startDiscAssessment,
  submitDiscAssessmentResponses,
} from "@/app/disc/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DiscAssessmentClient() {
  const [startState, startAction, starting] = useActionState(startDiscAssessment, initialDiscFlowState);
  const [submitState, submitAction, submitting] = useActionState(submitDiscAssessmentResponses, initialDiscFlowState);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const hasStartedSession = Boolean(currentSessionId);
  const submissionSucceeded = submitState.status === "success";

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">DISC assessment integration test</h1>
        <p className="text-sm text-muted-foreground">
          Starts a DISC session on the server and submits responses via the server-side integration layer.
        </p>
      </div>

      <form action={startAction}>
        <Button type="submit" disabled={starting || hasStartedSession}>
          {starting ? "Starting session..." : hasStartedSession ? "Session active" : "Start DISC session"}
        </Button>
      </form>

      {startState.status !== "idle" ? (
        <p className={startState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{startState.message}</p>
      ) : null}

      {currentSessionId ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Session ID</p>
          <p className="mt-1 break-all text-muted-foreground">{currentSessionId}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Start a DISC session before submitting responses.</p>
      )}

      <form action={submitAction} className="space-y-3">
        <input type="hidden" name="sessionId" value={currentSessionId} />
        <label className="block text-sm font-medium" htmlFor="responses">
          Responses JSON array
        </label>
        <Textarea
          id="responses"
          name="responses"
          className="min-h-36"
          placeholder='[{"questionId":"q1","value":"A"}]'
          required
        />
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
