"use client";

import { useActionState, useMemo, useState } from "react";

import {
  initialInviteDiscState,
  startInviteDiscAssessment,
  submitInviteDiscAssessment,
} from "@/app/disc/invite/[token]/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import type { DiscQuestion } from "@/lib/disc-types";

type InviteDiscClientProps = {
  token: string;
  candidateLabel: string;
  inviteState: "active" | "expired" | "invalidated" | "completed";
  latestAssessment: {
    id: string;
    status: "STARTED" | "SUBMITTED" | "FAILED";
    createdAt: Date;
    submittedAt: Date | null;
    externalSessionId: string;
    rawResponses: unknown;
    resultLink: string | null;
  } | null;
};

function CopyResultLinkButton({ resultLink }: { resultLink: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-8 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(resultLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy result link"}
    </Button>
  );
}

export function InviteDiscClient({ token, candidateLabel, inviteState, latestAssessment }: InviteDiscClientProps) {
  const [startState, startAction, starting] = useActionState(startInviteDiscAssessment, initialInviteDiscState);
  const [submitState, submitAction, submitting] = useActionState(submitInviteDiscAssessment, initialInviteDiscState);
  const [selectedOptionIdByQuestionId, setSelectedOptionIdByQuestionId] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const questions = startState.questions;
  const hasStartedSession = Boolean(currentSessionId);
  const submissionSucceeded = submitState.status === "success";
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions ? questions[Math.min(activeQuestionIndex, questions.length - 1)] : null;
  const allQuestionsAnswered =
    hasQuestions &&
    questions.every((question) => {
      const selectedOptionId = selectedOptionIdByQuestionId[question.id] ?? "";
      return selectedOptionId.length > 0 && question.options.some((option) => option.id === selectedOptionId);
    });
  const responsesPayload = useMemo(() => {
    const responses = questions
      .map((question) => {
        const selectedValue = selectedOptionIdByQuestionId[question.id] ?? "";
        if (!currentSessionId || !selectedValue) {
          return null;
        }

        const selectedOptionId = question.options.find((option) => option.id === selectedValue)?.id;
        if (!selectedOptionId) {
          return null;
        }

        return {
          sessionId: currentSessionId,
          questionId: question.id,
          selectedOptionIds: [selectedOptionId],
        };
      })
      .filter((response): response is { sessionId: string; questionId: string; selectedOptionIds: string[] } => response !== null);

    return JSON.stringify(responses);
  }, [currentSessionId, questions, selectedOptionIdByQuestionId]);

  const setSelectedOptionId = (question: DiscQuestion, optionId: string) => {
    setSelectedOptionIdByQuestionId((previous) => ({
      ...previous,
      [question.id]: optionId,
    }));
  };

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

        {latestAssessment.resultLink ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
            <CopyResultLinkButton resultLink={latestAssessment.resultLink} />
            <a
              href={latestAssessment.resultLink}
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              Open shared result
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">A permanent result link will appear once processing completes.</p>
        )}
      </div>
    );
  }

  if (inviteState === "completed") {
    return <p className="text-sm text-muted-foreground">This invite has already been completed and can no longer be used.</p>;
  }

  if (inviteState === "expired") {
    return <p className="text-sm text-destructive">This invite has expired. Please request a new invite.</p>;
  }

  if (inviteState === "invalidated") {
    return <p className="text-sm text-destructive">This invite was invalidated by the company.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Invite for {candidateLabel}. Start, complete, and submit your DISC assessment below.</p>

      <form action={startAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" disabled={starting || hasStartedSession}>
          {starting ? "Starting session..." : hasStartedSession ? "Session active" : "Start DISC session"}
        </Button>
      </form>

      {startState.status !== "idle" ? (
        <p className={startState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{startState.message}</p>
      ) : null}

      {hasStartedSession && !hasQuestions && startState.status !== "error" ? (
        <p className="text-sm text-muted-foreground">Loading assessment questions...</p>
      ) : null}

      {activeQuestion ? (
        <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Question {activeQuestionIndex + 1} of {questions.length}
          </p>
          <p className="text-sm font-medium">{activeQuestion.prompt}</p>

          {activeQuestion.options.length > 0 ? (
            <div className="space-y-2">
              {activeQuestion.options.map((option) => {
                return (
                  <label key={`${activeQuestion.id}-${option.id}`} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name={`question-${activeQuestion.id}`}
                      value={option.id}
                      checked={(selectedOptionIdByQuestionId[activeQuestion.id] ?? "") === option.id}
                      onChange={() => setSelectedOptionId(activeQuestion, option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-destructive">Question options are missing. Please restart your session.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setActiveQuestionIndex((index) => Math.max(0, index - 1))} disabled={activeQuestionIndex === 0}>
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveQuestionIndex((index) => Math.min(questions.length - 1, index + 1))}
              disabled={activeQuestionIndex >= questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <form
        action={submitAction}
        className="space-y-3"
        onSubmit={() => {
          const parsedResponses = JSON.parse(responsesPayload) as Array<{
            sessionId: string;
            questionId: string;
            selectedOptionIds: string[];
          }>;
          console.log("DISC invite submit payload", parsedResponses);
          console.table(
            parsedResponses.map((response, index) => {
              const question = questions.find((entry) => entry.id === response.questionId);
              const selectedOptionId = response.selectedOptionIds[0] ?? "";
              return {
                index: index + 1,
                hasSessionId: response.sessionId === currentSessionId,
                hasQuestionId: Boolean(question),
                selectedOptionIdsCount: response.selectedOptionIds.length,
                selectedOptionInQuestionOptions: Boolean(question?.options.some((option) => option.id === selectedOptionId)),
                selectedOptionId,
              };
            }),
          );
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="sessionId" value={currentSessionId} />
        <input type="hidden" name="responses" value={responsesPayload} />
        <Button type="submit" disabled={submitting || !hasStartedSession || !allQuestionsAnswered || submissionSucceeded}>
          {submitting ? "Submitting..." : submissionSucceeded ? "Submitted" : "Submit responses"}
        </Button>
        {hasStartedSession && hasQuestions && !allQuestionsAnswered ? (
          <p className="text-xs text-muted-foreground">Answer all questions before submitting.</p>
        ) : null}
      </form>

      {submitState.status !== "idle" ? (
        <p className={submitState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{submitState.message}</p>
      ) : null}
    </div>
  );
}
