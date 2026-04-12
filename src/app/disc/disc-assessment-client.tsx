"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";

import {
  initialDiscFlowState,
  startDiscAssessment,
  submitDiscAssessmentResponses,
} from "@/app/disc/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DiscAssessmentClientProps = {
  userId: string | null;
  assessments: Array<{
    id: string;
    status: "STARTED" | "SUBMITTED" | "FAILED";
    externalSessionId: string;
    createdAt: Date;
    submittedAt: Date | null;
  }>;
};

export function DiscAssessmentClient({ userId, assessments }: DiscAssessmentClientProps) {
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
        {userId ? (
          <p className="text-xs text-muted-foreground">
            Need to invite a candidate? <Link className="underline" href="/disc/company">Open company DISC admin</Link>
          </p>
        ) : null}
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

      {userId ? (
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your persisted assessments</h2>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved assessments yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {assessments.map((assessment) => (
                <li key={assessment.id} className="rounded-lg border border-border/70 p-2">
                  <p>Session: {assessment.externalSessionId}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {assessment.status.toLowerCase()} · Created: {assessment.createdAt.toISOString().slice(0, 10)} · Submitted:{" "}
                    {assessment.submittedAt ? assessment.submittedAt.toISOString().slice(0, 10) : "-"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
