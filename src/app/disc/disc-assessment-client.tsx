"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { initialDiscFlowState } from "@/app/disc/action-state";
import {
  startDiscAssessment,
  submitDiscAssessmentResponses,
} from "@/app/disc/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import {
  ContentContainer,
  PageIntro,
  PublicPageLayout,
  SectionBlock,
} from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";

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

const LIKERT_EDGE_LABELS = {
  low: "Helt uenig",
  high: "Helt enig",
} as const;

const LIKERT_TONES = [
  "from-rose-100 to-rose-200 border-rose-300 text-rose-900",
  "from-amber-100 to-amber-200 border-amber-300 text-amber-900",
  "from-slate-100 to-slate-200 border-slate-300 text-slate-900",
  "from-sky-100 to-sky-200 border-sky-300 text-sky-900",
  "from-emerald-100 to-emerald-200 border-emerald-300 text-emerald-900",
] as const;

const QUESTION_ADVANCE_DELAY_MS = 180;
const COMPLETION_TRANSITION_DELAY_MS = 250;

export function DiscAssessmentClient({ userId, hasCompanyDiscAccess, assessments }: DiscAssessmentClientProps) {
  const router = useRouter();
  const [startState, startAction, starting] = useActionState(startDiscAssessment, initialDiscFlowState);
  const [submitState, submitAction, submitting] = useActionState(submitDiscAssessmentResponses, initialDiscFlowState);
  const [selectedOptionIdByQuestionId, setSelectedOptionIdByQuestionId] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [furthestReachedQuestionIndex, setFurthestReachedQuestionIndex] = useState(0);
  const [isSummaryStep, setIsSummaryStep] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isTransitioningQuestion, setIsTransitioningQuestion] = useState(false);
  const [isCompletingAssessment, setIsCompletingAssessment] = useState(false);
  const submitFormRef = useRef<HTMLFormElement>(null);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const questions = startState.questions;
  const hasStartedSession = Boolean(currentSessionId);
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions && !isSummaryStep ? questions[Math.min(activeQuestionIndex, questions.length - 1)] : null;
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);

  const timelineItems = useMemo(() => {
    return questions
      .map((question, index) => {
        const answerId = selectedOptionIdByQuestionId[question.id] ?? "";
        const isCurrent = index === activeQuestionIndex;
        const isAnswered = Boolean(answerId);
        const shouldShow = index <= furthestReachedQuestionIndex || isCurrent;
        if (!shouldShow) {
          return null;
        }

        return {
          questionId: question.id,
          index,
          isCurrent,
          isAnswered,
        };
      })
      .filter((item): item is { questionId: string; index: number; isCurrent: boolean; isAnswered: boolean } => item !== null);
  }, [activeQuestionIndex, furthestReachedQuestionIndex, questions, selectedOptionIdByQuestionId]);

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

  useEffect(() => {
    if (startState.status === "success" && startState.sessionId && startState.questions.length > 0) {
      setIsAssessmentModalOpen(true);
      setActiveQuestionIndex(0);
      setFurthestReachedQuestionIndex(0);
      setIsSummaryStep(false);
      setSelectedOptionIdByQuestionId({});
      setIsCompletingAssessment(false);
    }
  }, [startState.questions.length, startState.sessionId, startState.status]);

  useEffect(() => {
    if (submitState.status === "success") {
      setIsCompletingAssessment(false);
      setIsAssessmentModalOpen(false);
      setIsSummaryStep(false);
      router.refresh();
    }

    if (submitState.status === "error") {
      setIsCompletingAssessment(false);
    }
  }, [router, submitState.status]);

  const handleOptionSelect = (optionId: string) => {
    if (!activeQuestion || isTransitioningQuestion || isCompletingAssessment || submitting) {
      return;
    }

    const nextAnswerMap = {
      ...selectedOptionIdByQuestionId,
      [activeQuestion.id]: optionId,
    };

    setSelectedOptionIdByQuestionId((previous) => ({
      ...previous,
      [activeQuestion.id]: optionId,
    }));

    const isLastQuestion = activeQuestionIndex >= questions.length - 1;
    if (isLastQuestion) {
      setFurthestReachedQuestionIndex(questions.length - 1);
      setIsSummaryStep(true);
      return;
    }

    setIsTransitioningQuestion(true);
    window.setTimeout(() => {
      const nextIndex = Math.min(questions.length - 1, activeQuestionIndex + 1);
      setActiveQuestionIndex(nextIndex);
      setFurthestReachedQuestionIndex((previous) => Math.max(previous, nextIndex));
      if (!nextAnswerMap[questions[nextIndex]?.id]) {
        setIsSummaryStep(false);
      }
      setIsTransitioningQuestion(false);
    }, QUESTION_ADVANCE_DELAY_MS);
  };

  const progressPercent = hasQuestions ? (((furthestReachedQuestionIndex + 1) / questions.length) * 100) : 0;
  const answeredCount = questions.filter((question) => Boolean(selectedOptionIdByQuestionId[question.id])).length;
  const isReadyForSubmit = hasQuestions && answeredCount === questions.length;

  const handleQuestionJump = (index: number) => {
    setActiveQuestionIndex(index);
    setIsSummaryStep(false);
    setIsMobileTimelineOpen(false);
  };

  const handleCloseAssessment = () => {
    if (!currentSessionId || !isReadyForSubmit || isCompletingAssessment || submitting) {
      return;
    }

    setIsCompletingAssessment(true);
    window.setTimeout(() => submitFormRef.current?.requestSubmit(), COMPLETION_TRANSITION_DELAY_MS);
  };

  return (
    <>
      <PublicPageLayout>
        <PageIntro
          eyebrow="DISC"
          title="Understand your DISC profile"
          intro="Use DISC to assess communication and behavior preferences, then continue into personal or company-driven assessment workflows."
        >
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setIsStartModalOpen(true)} disabled={starting || hasStartedSession}>
              {starting ? "Starting session..." : hasStartedSession ? "Session active" : "Take DISC assessment"}
            </Button>
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
            {!hasStartedSession ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => setIsStartModalOpen(true)} disabled={starting}>
                  {starting ? "Starting session..." : "Take DISC assessment"}
                </Button>
              </div>
            ) : null}

            {startState.status !== "idle" ? (
              <p className={startState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{startState.message}</p>
            ) : null}

            {submitState.status !== "idle" ? (
              <p className={submitState.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{submitState.message}</p>
            ) : null}

            {hasStartedSession && !hasQuestions && startState.status !== "error" ? (
              <p className="text-sm text-muted-foreground">Loading assessment questions...</p>
            ) : null}

            {!hasStartedSession && userId ? (
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

      <form ref={submitFormRef} action={submitAction} className="hidden">
        <input type="hidden" name="sessionId" value={currentSessionId} />
        <input type="hidden" name="responses" value={responsesPayload} />
      </form>

      {isStartModalOpen && !hasStartedSession ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">DISC assessment</p>
            <h2 className="mt-2 text-xl font-semibold">Svar intuitivt og ærligt</h2>
            <p className="mt-2 text-sm text-muted-foreground">Du får ét spørgsmål ad gangen. Vælg det svar der føles mest rigtigt med det samme.</p>
            <p className="mt-2 text-sm font-medium text-foreground">Tager ca. 2–3 minutter.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsStartModalOpen(false)}>
                Luk
              </Button>
              <form action={startAction}>
                <Button type="submit" disabled={starting}>{starting ? "Starting..." : "Start test"}</Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {hasStartedSession && isAssessmentModalOpen ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 rounded-2xl border border-border/60 bg-muted/20 p-3 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileTimelineOpen((open) => !open)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Answer review</span>
                <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
              </button>
              {isMobileTimelineOpen ? (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {timelineItems.map((item) => (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => handleQuestionJump(item.index)}
                      disabled={!item.isAnswered && !item.isCurrent}
                      className={cn(
                        "w-full rounded-lg border px-2 py-2 text-center text-[11px] transition",
                        item.isCurrent ? "border-foreground/45 bg-foreground/5 text-foreground" : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{item.index + 1}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
              <aside className="sticky top-8 hidden pr-2 md:block">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Oversigt</p>
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                  <p className="mb-3 text-[11px] text-muted-foreground">{answeredCount} af {questions.length} besvaret</p>
                  <div className="grid grid-cols-4 gap-2">
                    {timelineItems.map((item) => (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => handleQuestionJump(item.index)}
                      disabled={!item.isAnswered && !item.isCurrent}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition",
                        item.isCurrent ? "border-foreground/45 bg-foreground/5 text-foreground" : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                        item.isAnswered ? "" : "opacity-70",
                      )}
                    >
                      {item.index + 1}
                    </button>
                  ))}
                  </div>
                  {furthestReachedQuestionIndex > activeQuestionIndex ? (
                    <button
                      type="button"
                      onClick={() => handleQuestionJump(furthestReachedQuestionIndex)}
                      className="mt-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                    >
                      Tilbage til spørgsmål {furthestReachedQuestionIndex + 1}
                    </button>
                  ) : null}
                </div>
              </aside>

              <div>
            <div className="mb-8 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{isSummaryStep ? "Afsluttende overblik" : `Spørgsmål ${activeQuestionIndex + 1} af ${questions.length}`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/80 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className={cn("mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-opacity duration-200 sm:p-10", isTransitioningQuestion && "opacity-0")}>
              {isSummaryStep ? (
                <div>
                  <p className="text-xl font-semibold text-foreground sm:text-2xl">Gennemgå dine svar</p>
                  <p className="mt-2 text-sm text-muted-foreground">Du kan hurtigt kontrollere alle svar, før du afslutter testen.</p>
                  <div className="mt-6 space-y-2">
                    {questions.map((question, index) => {
                      const isAnswered = Boolean(selectedOptionIdByQuestionId[question.id]);
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => handleQuestionJump(index)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                            isAnswered ? "border-border/70 bg-card hover:border-foreground/30" : "border-destructive/40 bg-destructive/5",
                          )}
                        >
                          <span>Spørgsmål {index + 1}</span>
                          <span className={cn("text-xs", isAnswered ? "text-emerald-700 dark:text-emerald-300" : "text-destructive")}>
                            {isAnswered ? "Besvaret" : "Mangler svar"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button type="button" onClick={handleCloseAssessment} disabled={!isReadyForSubmit || isCompletingAssessment || submitting}>
                      {isCompletingAssessment || submitting ? "Gemmer..." : "Luk"}
                    </Button>
                  </div>
                </div>
              ) : activeQuestion ? (
                <>
                  <p className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">{activeQuestion.prompt}</p>

                  {activeQuestion.options.length > 0 ? (
                <div className="mt-10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
                    <span>{LIKERT_EDGE_LABELS.low}</span>
                    <span>{LIKERT_EDGE_LABELS.high}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {activeQuestion.options.slice(0, 5).map((option, index) => {
                      const selected = (selectedOptionIdByQuestionId[activeQuestion.id] ?? "") === option.id;
                      return (
                        <button
                          key={`${activeQuestion.id}-${option.id}`}
                          type="button"
                          onClick={() => handleOptionSelect(option.id)}
                          className={cn(
                            "relative h-14 rounded-xl border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            "bg-gradient-to-b hover:-translate-y-0.5 dark:opacity-90",
                            LIKERT_TONES[index] ?? LIKERT_TONES[2],
                            selected
                              ? "border-foreground/60 ring-2 ring-foreground/55 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(148,163,184,0.18)]"
                              : "opacity-90 hover:opacity-100",
                          )}
                          aria-label={`${index + 1}. ${option.label}`}
                        >
                          <span className="sr-only">{option.label}</span>
                          {selected ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-foreground/85" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-destructive">Question options are missing. Please restart your session.</p>
              )}
                </>
              ) : null}
              {isCompletingAssessment || submitting ? (
                <div className="mt-8 space-y-1 text-sm text-muted-foreground">
                  <p>Processing your DISC profile...</p>
                  <p className="text-xs">Vi samler dine svar og gør resultatet klar.</p>
                </div>
              ) : !isSummaryStep ? (
                <p className="mt-8 text-sm text-muted-foreground">Vælg det svar der passer bedst — og gå videre.</p>
              ) : null}
            </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
