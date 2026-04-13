"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  startDiscAssessment,
  submitDiscAssessmentResponses,
} from "@/app/disc/actions";
import { initialDiscFlowState } from "@/app/disc/action-state";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import { ContentContainer, PageIntro, PublicPageLayout, SectionBlock } from "@/components/ui/page-layout";
import type { DiscQuestion } from "@/lib/disc-types";

type DiscAssessmentClientProps = {
  userId: string | null;
  hasCompanyDiscAccess: boolean;
  assessments: Array<{
    id: string;
    status: "STARTED" | "SUBMITTED" | "FAILED";
    externalSessionId: string;
    createdAt: Date;
    submittedAt: Date | null;
    rawResponses: unknown;
  }>;
};

function StartAssessmentButton({
  action,
  disabled,
  loading,
  hasStartedSession,
}: {
  action: (formData: FormData) => void;
  disabled?: boolean;
  loading: boolean;
  hasStartedSession: boolean;
}) {
  return (
    <form action={action}>
      <Button type="submit" disabled={disabled ?? (loading || hasStartedSession)}>
        {loading ? "Starting session..." : hasStartedSession ? "Session active" : "Take DISC assessment"}
      </Button>
    </form>
  );
}

export function DiscAssessmentClient({ userId, hasCompanyDiscAccess, assessments }: DiscAssessmentClientProps) {
  const [startState, startAction, starting] = useActionState(startDiscAssessment, initialDiscFlowState);
  const [submitState, submitAction, submitting] = useActionState(submitDiscAssessmentResponses, initialDiscFlowState);
  const [responsesByQuestionId, setResponsesByQuestionId] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const questions = startState.questions;
  const hasStartedSession = Boolean(currentSessionId);
  const submissionSucceeded = submitState.status === "success";
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions ? questions[Math.min(activeQuestionIndex, questions.length - 1)] : null;
  const allQuestionsAnswered = hasQuestions && questions.every((question) => (responsesByQuestionId[question.id] ?? "").trim().length > 0);
  const responsesPayload = useMemo(
    () => JSON.stringify(questions.filter((question) => (responsesByQuestionId[question.id] ?? "").trim().length > 0).map((question) => ({ questionId: question.id, value: responsesByQuestionId[question.id] }))),
    [questions, responsesByQuestionId],
  );

  const setResponse = (question: DiscQuestion, value: string) => {
    setResponsesByQuestionId((previous) => ({
      ...previous,
      [question.id]: value,
    }));
  };

  return (
    <PublicPageLayout>
      <PageIntro
        eyebrow="DISC"
        title="Understand your DISC profile"
        intro="Use DISC to assess communication and behavior preferences, then continue into personal or company-driven assessment workflows."
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <StartAssessmentButton action={startAction} loading={starting} hasStartedSession={hasStartedSession} />
          {hasCompanyDiscAccess ? (
            <Button asChild variant="outline">
              <Link href="/disc/company">Company assessments</Link>
            </Button>
          ) : null}
        </div>
      </PageIntro>

      <SectionBlock
        title="Personal assessment"
        subtitle="Start a new DISC session for your own use, submit your responses, and review your recent history."
      >
        <ContentContainer>
          <div className="flex flex-wrap gap-3">
            <StartAssessmentButton action={startAction} loading={starting} hasStartedSession={hasStartedSession} />
          </div>

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
                    const optionValue = String(option.value);
                    return (
                      <label key={`${activeQuestion.id}-${optionValue}`} className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name={`question-${activeQuestion.id}`}
                          value={optionValue}
                          checked={(responsesByQuestionId[activeQuestion.id] ?? "") === optionValue}
                          onChange={(event) => setResponse(activeQuestion, event.target.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={responsesByQuestionId[activeQuestion.id] ?? ""}
                  onChange={(event) => setResponse(activeQuestion, event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Type your answer"
                />
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

          <form action={submitAction} className="space-y-3">
            <input type="hidden" name="sessionId" value={currentSessionId} />
            <input type="hidden" name="responses" value={responsesPayload} />
            <Button type="submit" disabled={submitting || !hasStartedSession || !allQuestionsAnswered || submissionSucceeded}>
              {submitting ? "Submitting..." : submissionSucceeded ? "Submitted" : "Submit assessment"}
            </Button>
            {hasStartedSession && hasQuestions && !allQuestionsAnswered ? (
              <p className="text-xs text-muted-foreground">Answer all questions before submitting.</p>
            ) : null}
          </form>

          {submitState.status !== "idle" ? (
            <p className={submitState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{submitState.message}</p>
          ) : null}

          {userId ? (
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your assessment history</h3>
              {assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved assessments yet.</p>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment, index) => (
                    <DiscResultPresentation
                      key={assessment.id}
                      title={`Assessment #${assessments.length - index}`}
                      status={assessment.status}
                      createdAt={assessment.createdAt}
                      submittedAt={assessment.submittedAt}
                      rawResponses={assessment.rawResponses}
                      externalSessionId={assessment.externalSessionId}
                      emptyMessage="This completed assessment does not include full result details yet."
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </ContentContainer>
      </SectionBlock>

      {hasCompanyDiscAccess ? (
        <SectionBlock
          title="Company assessments"
          subtitle="Invite candidates and review completed company DISC assessments for recruiter/admin workflows."
        >
          <ContentContainer>
            <p className="text-sm text-muted-foreground">
              Use the company admin area to create invite links and follow submitted assessments for your organization.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/disc/company">Go to invites</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/disc/company">Go to company assessments</Link>
              </Button>
            </div>
          </ContentContainer>
        </SectionBlock>
      ) : null}
    </PublicPageLayout>
  );
}
