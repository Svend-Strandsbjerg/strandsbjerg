"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  initialInviteDiscState,
  startInviteDiscAssessment,
  submitInviteDiscAssessment,
} from "@/app/disc/invite/[token]/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
const COMPLETION_TRANSITION_DELAY_MS = 1050;
const QUESTION_PREVIEW_MAX = 46;

function toQuestionPreview(prompt: string) {
  const collapsed = prompt.replace(/\s+/g, " ").trim();
  if (collapsed.length <= QUESTION_PREVIEW_MAX) {
    return collapsed;
  }

  return `${collapsed.slice(0, QUESTION_PREVIEW_MAX - 1).trimEnd()}…`;
}

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
  const router = useRouter();
  const [startState, startAction, starting] = useActionState(startInviteDiscAssessment, initialInviteDiscState);
  const [submitState, submitAction, submitting] = useActionState(submitInviteDiscAssessment, initialInviteDiscState);
  const [selectedOptionIdByQuestionId, setSelectedOptionIdByQuestionId] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isTransitioningQuestion, setIsTransitioningQuestion] = useState(false);
  const [isCompletingAssessment, setIsCompletingAssessment] = useState(false);
  const submitFormRef = useRef<HTMLFormElement>(null);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const questions = startState.questions;
  const hasStartedSession = Boolean(currentSessionId);
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions ? questions[Math.min(activeQuestionIndex, questions.length - 1)] : null;
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);

  const timelineItems = useMemo(() => {
    return questions
      .map((question, index) => {
        const answerId = selectedOptionIdByQuestionId[question.id] ?? "";
        const isCurrent = index === activeQuestionIndex;
        const isAnswered = Boolean(answerId);
        const shouldShow = isCurrent || (index < activeQuestionIndex && isAnswered);
        if (!shouldShow) {
          return null;
        }

        return {
          questionId: question.id,
          index,
          isCurrent,
          isAnswered,
          preview: toQuestionPreview(question.prompt),
        };
      })
      .filter((item): item is { questionId: string; index: number; isCurrent: boolean; isAnswered: boolean; preview: string } => item !== null);
  }, [activeQuestionIndex, questions, selectedOptionIdByQuestionId]);

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
    if (submitState.status === "success") {
      setIsCompletingAssessment(false);
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

    setSelectedOptionIdByQuestionId((previous) => ({
      ...previous,
      [activeQuestion.id]: optionId,
    }));

    const isLastQuestion = activeQuestionIndex >= questions.length - 1;
    if (isLastQuestion) {
      setIsCompletingAssessment(true);
      window.setTimeout(() => submitFormRef.current?.requestSubmit(), COMPLETION_TRANSITION_DELAY_MS);
      return;
    }

    setIsTransitioningQuestion(true);
    window.setTimeout(() => {
      setActiveQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
      setIsTransitioningQuestion(false);
    }, QUESTION_ADVANCE_DELAY_MS);
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

  const progressPercent = hasQuestions ? ((activeQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Invite for {candidateLabel}. Start, complete, and submit your DISC assessment below.</p>

        {!hasStartedSession ? (
          <Button type="button" onClick={() => setIsStartModalOpen(true)} disabled={starting}>
            {starting ? "Starting session..." : "Take assessment"}
          </Button>
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
      </div>

      <form ref={submitFormRef} action={submitAction} className="hidden">
        <input type="hidden" name="token" value={token} />
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
                <input type="hidden" name="token" value={token} />
                <Button type="submit" disabled={starting}>{starting ? "Starting..." : "Start test"}</Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {hasStartedSession && activeQuestion ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 rounded-2xl border border-border/60 bg-muted/20 p-3 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileTimelineOpen((open) => !open)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Answer review</span>
                <span className="text-xs text-muted-foreground">{timelineItems.length} shown</span>
              </button>
              {isMobileTimelineOpen ? (
                <div className="mt-3 space-y-2">
                  {timelineItems.map((item) => (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => {
                        setActiveQuestionIndex(item.index);
                        setIsMobileTimelineOpen(false);
                      }}
                      disabled={!item.isAnswered && !item.isCurrent}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left text-xs transition",
                        item.isCurrent ? "border-foreground/40 bg-foreground/5 text-foreground" : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="mr-1 text-[11px] uppercase tracking-[0.12em]">#{item.index + 1}</span>
                      {item.preview}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
              <aside className="sticky top-8 hidden max-h-[calc(100vh-4rem)] overflow-y-auto pr-2 md:block">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Answer timeline</p>
                <div className="space-y-2">
                  {timelineItems.map((item, itemIndex) => (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => setActiveQuestionIndex(item.index)}
                      disabled={!item.isAnswered && !item.isCurrent}
                      className={cn(
                        "group relative w-full rounded-xl border px-3 py-2 text-left transition",
                        item.isCurrent ? "border-foreground/40 bg-foreground/5 text-foreground shadow-sm" : "border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      {itemIndex < timelineItems.length - 1 ? <span className="pointer-events-none absolute -bottom-3 left-5 h-3 w-px bg-border/80" /> : null}
                      <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", item.isCurrent ? "bg-foreground" : "bg-muted-foreground/60")} />
                      <span className="text-[11px] uppercase tracking-[0.12em]">#{item.index + 1}</span>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed">{item.preview}</p>
                    </button>
                  ))}
                </div>
              </aside>

              <div>
            <div className="mb-8 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Spørgsmål {activeQuestionIndex + 1} af {questions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/80 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div
              className={cn(
                "mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-opacity duration-200 sm:p-10",
                isTransitioningQuestion && "opacity-0",
              )}
            >
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
                            "h-14 rounded-xl border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            "bg-gradient-to-b hover:-translate-y-0.5",
                            LIKERT_TONES[index] ?? LIKERT_TONES[2],
                            selected ? "ring-2 ring-foreground/70 shadow-sm" : "opacity-85 hover:opacity-100",
                          )}
                          aria-label={`${index + 1}. ${option.label}`}
                        >
                          <span className="sr-only">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-destructive">Question options are missing. Please restart your session.</p>
              )}

              {isCompletingAssessment || submitting ? (
                <div className="mt-8 space-y-1 text-sm text-muted-foreground">
                  <p>Processing your DISC profile...</p>
                  <p className="text-xs">Vi samler dine svar og gør resultatet klar.</p>
                </div>
              ) : (
                <p className="mt-8 text-sm text-muted-foreground">Vælg det svar der passer bedst — og gå videre.</p>
              )}
            </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
