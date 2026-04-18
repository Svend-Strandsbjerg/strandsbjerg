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
import { DiscVersionSelector } from "@/components/disc/disc-version-selector";
import { Button } from "@/components/ui/button";
import {
  ContentContainer,
  PageIntro,
  PublicPageLayout,
  SectionBlock,
} from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";
import type { DiscVersionEntitlement } from "@/lib/disc-types";

type DiscAssessmentClientProps = {
  userId: string | null;
  versionEntitlements: DiscVersionEntitlement[];
  autoSelectedAssessmentVersionId: string | null;
  versionDiscoveryError: string | null;
  hasCompanyDiscAccess: boolean;
  totalAssessmentCount: number;
  remainingPromoCredits: number;
  promoEntryState?: string | null;
  assessments: Array<{
    id: string;
    status: "STARTED" | "SUBMITTED" | "FAILED";
    externalSessionId: string;
    createdAt: Date;
    submittedAt: Date | null;
    rawResponses: unknown;
    resultShare: {
      token: string;
    } | null;
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

const LIKERT_NODE_TONES = [
  "border-rose-400/70 bg-rose-500/85 text-white dark:border-rose-300/70 dark:bg-rose-400/90 dark:text-slate-950",
  "border-amber-400/80 bg-amber-500/90 text-white dark:border-amber-300/70 dark:bg-amber-400/90 dark:text-slate-950",
  "border-slate-400/80 bg-slate-500/90 text-white dark:border-slate-300/80 dark:bg-slate-300/90 dark:text-slate-950",
  "border-sky-400/80 bg-sky-500/90 text-white dark:border-sky-300/70 dark:bg-sky-400/90 dark:text-slate-950",
  "border-emerald-400/80 bg-emerald-500/90 text-white dark:border-emerald-300/70 dark:bg-emerald-400/90 dark:text-slate-950",
] as const;

const QUESTION_ADVANCE_DELAY_MS = 180;
const COMPLETION_TRANSITION_DELAY_MS = 250;

export function DiscAssessmentClient({
  userId,
  versionEntitlements,
  autoSelectedAssessmentVersionId,
  versionDiscoveryError,
  hasCompanyDiscAccess,
  totalAssessmentCount,
  remainingPromoCredits,
  promoEntryState,
  assessments,
}: DiscAssessmentClientProps) {
  const router = useRouter();
  const [startState, startAction, starting] = useActionState(startDiscAssessment, initialDiscFlowState);
  const [submitState, submitAction, submitting] = useActionState(submitDiscAssessmentResponses, initialDiscFlowState);
  const [selectedOptionIdByQuestionId, setSelectedOptionIdByQuestionId] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [hasEnteredFinalOverview, setHasEnteredFinalOverview] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isTransitioningQuestion, setIsTransitioningQuestion] = useState(false);
  const [isCompletingAssessment, setIsCompletingAssessment] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [selectedAssessmentVersionId, setSelectedAssessmentVersionId] = useState(autoSelectedAssessmentVersionId ?? "");
  const submitFormRef = useRef<HTMLFormElement>(null);

  const currentSessionId = useMemo(() => submitState.sessionId || startState.sessionId, [startState.sessionId, submitState.sessionId]);
  const questions = startState.questions;
  const hasStartedSession = Boolean(activeSessionId);
  const hasQuestions = questions.length > 0;
  const selectableEntitlements = useMemo(() => versionEntitlements.filter((entitlement) => entitlement.status === "selectable"), [versionEntitlements]);
  const selectedVersion = useMemo(
    () => versionEntitlements.find((entitlement) => entitlement.version.id === selectedAssessmentVersionId)?.version ?? null,
    [versionEntitlements, selectedAssessmentVersionId],
  );
  const activeQuestion = hasQuestions ? questions[Math.min(activeQuestionIndex, questions.length - 1)] : null;
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);

  const highestAnsweredQuestionIndex = useMemo(
    () =>
      questions.reduce((highestIndex, question, index) => {
        if (selectedOptionIdByQuestionId[question.id]) {
          return Math.max(highestIndex, index);
        }

        return highestIndex;
      }, -1),
    [questions, selectedOptionIdByQuestionId],
  );

  const timelineItems = useMemo(() => {
    return questions
      .map((question, index) => {
        const answerId = selectedOptionIdByQuestionId[question.id] ?? "";
        const isCurrent = index === activeQuestionIndex;
        const isAnswered = Boolean(answerId);
        const optionIndex = question.options.findIndex((option) => option.id === answerId);

        return {
          questionId: question.id,
          index,
          isCurrent,
          isAnswered,
          selectedOptionIndex: optionIndex >= 0 ? optionIndex : null,
        };
      })
      .filter((item): item is { questionId: string; index: number; isCurrent: boolean; isAnswered: boolean; selectedOptionIndex: number | null } => item !== null);
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
    if (startState.status === "success" && startState.sessionId && startState.questions.length > 0) {
      setActiveSessionId(startState.sessionId);
      setIsAssessmentModalOpen(true);
      setIsStartModalOpen(false);
      setActiveQuestionIndex(0);
      setHasEnteredFinalOverview(false);
      setSelectedOptionIdByQuestionId({});
      setIsCompletingAssessment(false);
    }
  }, [startState.questions.length, startState.sessionId, startState.status]);

  useEffect(() => {
    if (submitState.status === "success") {
      setActiveSessionId("");
      setIsCompletingAssessment(false);
      setIsAssessmentModalOpen(false);
      setHasEnteredFinalOverview(false);
      setIsStartModalOpen(false);
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
      setHasEnteredFinalOverview(true);
      return;
    }

    setIsTransitioningQuestion(true);
    window.setTimeout(() => {
      const nextIndex = Math.min(questions.length - 1, activeQuestionIndex + 1);
      setActiveQuestionIndex(nextIndex);
      setIsTransitioningQuestion(false);
    }, QUESTION_ADVANCE_DELAY_MS);
  };

  const progressPercent = hasQuestions ? (((Math.max(highestAnsweredQuestionIndex, activeQuestionIndex) + 1) / questions.length) * 100) : 0;
  const answeredCount = questions.filter((question) => Boolean(selectedOptionIdByQuestionId[question.id])).length;
  const isReadyForSubmit = hasQuestions && answeredCount === questions.length;
  const isFinalOverviewVisible = hasEnteredFinalOverview && isReadyForSubmit;
  const canStartAssessment = selectedAssessmentVersionId.length > 0 && !versionDiscoveryError;
  const promoStateCopy =
    promoEntryState === "ready"
      ? "Din kampagnekredit er klar. Vælg DISC-version og start testen."
      : promoEntryState === "used"
        ? "Din tidligere kampagnekredit er brugt. Du kan stadig se historik i dit DISC-overblik."
        : promoEntryState === "redeemed"
          ? "Din kampagne blev aktiveret. Du kan starte din DISC-test nu."
          : null;

  useEffect(() => {
    if (!selectedAssessmentVersionId && selectableEntitlements.length === 1) {
      setSelectedAssessmentVersionId(selectableEntitlements[0].version.id);
    }
  }, [selectableEntitlements, selectedAssessmentVersionId]);

  useEffect(() => {
    if (isReadyForSubmit) {
      setHasEnteredFinalOverview(true);
    }
  }, [isReadyForSubmit]);

  const handleQuestionJump = (index: number) => {
    if (isFinalOverviewVisible) {
      return;
    }

    setActiveQuestionIndex(index);
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
            <Button type="button" onClick={() => setIsStartModalOpen(true)} disabled={starting || hasStartedSession || selectableEntitlements.length === 0}>
              {starting ? "Starting session..." : hasStartedSession ? "Session active" : "Take DISC assessment"}
            </Button>
            {hasCompanyDiscAccess ? (
              <Button asChild variant="outline">
                <Link href="/disc/company">Company assessments</Link>
              </Button>
            ) : null}
          </div>
          {remainingPromoCredits > 0 ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              Du har {remainingPromoCredits} aktiv(e) kampagnekredit(ter). Kreditter bruges ved start af en DISC-session.
            </p>
          ) : null}
        </PageIntro>

        <SectionBlock
          title="Personal assessment"
          subtitle="Start a new DISC session for your own use, submit your responses, and review your recent history."
        >
          <ContentContainer>
            {promoStateCopy ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                <p className="text-sm font-medium text-sky-900">{promoStateCopy}</p>
              </div>
            ) : null}
            {!hasStartedSession ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => setIsStartModalOpen(true)} disabled={starting || selectableEntitlements.length === 0}>
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
            {!hasStartedSession && selectableEntitlements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Der er ingen DISC-assessments tilgængelige for denne konto lige nu.</p>
            ) : null}
            {!hasStartedSession ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                {remainingPromoCredits > 0
                  ? `Du har ${remainingPromoCredits} gratis kampagnekredit(ter) klar. Kreditter bruges ved sessionstart.`
                  : "Ingen aktive kampagnekreditter lige nu. Start stadig DISC med dine øvrige entitlements."}
              </div>
            ) : null}

            {userId ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mit DISC-hjem</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Dit nyeste resultat står øverst, og tidligere resultater ligger nedenfor.</p>
                  {totalAssessmentCount > assessments.length ? (
                    <p className="mt-1 text-xs text-muted-foreground">Viser de seneste {assessments.length} af i alt {totalAssessmentCount} assessments.</p>
                  ) : null}
                </div>

                {assessments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Du har ikke gennemført en DISC endnu.</p>
                ) : (
                  <>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Seneste assessment</p>
                      <div className="mt-2">
                        <DiscResultPresentation
                          title="Seneste DISC-resultat"
                          status={assessments[0].status}
                          createdAt={assessments[0].createdAt}
                          submittedAt={assessments[0].submittedAt}
                          rawResponses={assessments[0].rawResponses}
                          externalSessionId={assessments[0].externalSessionId}
                          pdfHref={assessments[0].resultShare ? `/disc/result/${assessments[0].resultShare.token}/pdf` : undefined}
                          emptyMessage="Dette resultat mangler stadig detaljer."
                        />
                      </div>
                    </div>

                    {assessments.length > 1 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tidligere assessments</p>
                        {assessments.slice(1).map((assessment, index) => (
                          <DiscResultPresentation
                            key={assessment.id}
                            title={`Assessment historik #${index + 1}`}
                            status={assessment.status}
                            createdAt={assessment.createdAt}
                            submittedAt={assessment.submittedAt}
                            rawResponses={assessment.rawResponses}
                            externalSessionId={assessment.externalSessionId}
                            pdfHref={assessment.resultShare ? `/disc/result/${assessment.resultShare.token}/pdf` : undefined}
                            emptyMessage="Dette resultat mangler stadig detaljer."
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </ContentContainer>
        </SectionBlock>

        {hasCompanyDiscAccess ? (
          <SectionBlock
            title="Company assessments"
            subtitle="Review company DISC assessments with role-based access for company admins and viewers."
          >
            <ContentContainer>
              <p className="text-sm text-muted-foreground">
                Use the company area to review submitted assessments. Company admins can additionally create and manage invites.
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
            <div className="mt-4">
              {versionEntitlements.length > 0 ? (
                <DiscVersionSelector
                  entitlements={versionEntitlements}
                  selectedVersionId={selectedAssessmentVersionId}
                  onSelect={setSelectedAssessmentVersionId}
                  disabled={starting}
                />
              ) : null}
              {versionDiscoveryError ? (
                <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alert" aria-live="polite">
                  <p className="text-sm font-medium text-destructive">DISC-versioner kunne ikke hentes</p>
                  <p className="mt-1 text-sm text-destructive/90">{versionDiscoveryError}</p>
                </div>
              ) : null}
            </div>
            {selectedVersion?.estimatedDurationMinutes ? (
              <p className="mt-2 text-sm font-medium text-foreground">Tager ca. {selectedVersion.estimatedDurationMinutes} minutter.</p>
            ) : null}
            {startState.status === "error" ? (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alert" aria-live="polite">
                <p className="text-sm font-medium text-destructive">Kunne ikke starte testen</p>
                <p className="mt-1 text-sm text-destructive/90">{startState.message}</p>
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStartModalOpen(false)}>
                Luk
              </Button>
              <form action={startAction}>
                <input type="hidden" name="assessmentVersionId" value={selectedAssessmentVersionId} />
                <Button type="submit" disabled={starting || !canStartAssessment}>{starting ? "Starting..." : "Start test"}</Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {hasStartedSession && isAssessmentModalOpen ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
            <div className={cn("mb-6 rounded-2xl border border-border/60 bg-muted/20 p-3 md:hidden", isFinalOverviewVisible ? "hidden" : "")}>
              <button
                type="button"
                onClick={() => setIsMobileTimelineOpen((open) => !open)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Answer review</span>
                <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
              </button>
              {isMobileTimelineOpen ? (
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {timelineItems.map((item) => (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => handleQuestionJump(item.index)}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-lg border text-[11px] font-semibold transition",
                        item.isAnswered && item.selectedOptionIndex !== null
                          ? LIKERT_NODE_TONES[item.selectedOptionIndex] ?? LIKERT_NODE_TONES[2]
                          : "border-border/70 bg-card/80 text-muted-foreground hover:text-foreground",
                        item.isCurrent ? "ring-2 ring-foreground/65 ring-offset-1 ring-offset-background" : "",
                      )}
                    >
                      {item.index + 1}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={cn("grid min-h-0 flex-1 gap-6", isFinalOverviewVisible ? "md:grid-cols-1 md:items-start" : "md:grid-cols-[220px_minmax(0,1fr)_220px] md:items-start")}>
              <aside className={cn("sticky top-8 hidden pr-2 md:block", isFinalOverviewVisible ? "md:hidden" : "")}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Oversigt</p>
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                  <p className="mb-3 text-[11px] text-muted-foreground">Viser {activeQuestionIndex + 1} · Progress {Math.max(highestAnsweredQuestionIndex + 1, 0)}/{questions.length}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {timelineItems.map((item) => (
                      <button
                        key={item.questionId}
                        type="button"
                        onClick={() => handleQuestionJump(item.index)}
                        className={cn(
                          "relative flex h-9 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          item.isAnswered && item.selectedOptionIndex !== null
                            ? LIKERT_NODE_TONES[item.selectedOptionIndex] ?? LIKERT_NODE_TONES[2]
                            : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
                          item.isCurrent ? "ring-2 ring-foreground/65 ring-offset-1 ring-offset-background" : "",
                        )}
                      >
                        {item.index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className={cn("min-h-0", !isFinalOverviewVisible ? "flex flex-col items-center" : "")}>
                {!isFinalOverviewVisible ? (
                  <>
                    <div className="mb-8 w-full max-w-xl space-y-3">
                      <div className="flex items-center justify-center text-sm text-muted-foreground">
                        <span>{`Spørgsmål ${activeQuestionIndex + 1} af ${questions.length}`}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/80 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "w-full max-w-xl rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-opacity duration-200 sm:p-10",
                        isTransitioningQuestion && "opacity-0",
                      )}
                    >
                      {activeQuestion ? (
                        <>
                          <div className="flex min-h-[25rem] flex-col">
                            <div className="min-h-[8.5rem]">
                              <p className="text-center text-xl font-medium leading-relaxed text-foreground sm:text-2xl">{activeQuestion.prompt}</p>
                            </div>

                            {activeQuestion.options.length > 0 ? (
                              <div className="mt-auto space-y-3 pt-10">
                                <div className="flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
                                  <span>{LIKERT_EDGE_LABELS.low}</span>
                                  <span>{LIKERT_EDGE_LABELS.high}</span>
                                </div>
                                <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(activeQuestion.options.length, 1)}, minmax(0, 1fr))` }}>
                                  {activeQuestion.options.map((option, index) => {
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
                                            ? "border-foreground ring-2 ring-foreground/80 shadow-[0_0_0_2px_rgba(15,23,42,0.15)] dark:shadow-[0_0_0_2px_rgba(248,250,252,0.25)]"
                                            : "opacity-90 hover:opacity-100",
                                        )}
                                        aria-label={`${index + 1}. ${option.label}`}
                                      >
                                        <span className="sr-only">{option.label}</span>
                                        {selected ? (
                                          <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-foreground/40 bg-background/85">
                                            <span className="h-2 w-2 rounded-full bg-foreground/90" />
                                          </span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-destructive">Question options are missing. Please restart your session.</p>
                            )}
                          </div>
                        </>
                      ) : null}
                      {isCompletingAssessment || submitting ? (
                        <div className="mt-8 space-y-1 text-sm text-muted-foreground">
                          <p>Processing your DISC profile...</p>
                          <p className="text-xs">Vi samler dine svar og gør resultatet klar.</p>
                        </div>
                      ) : (
                        <p className="mt-8 text-center text-sm text-muted-foreground">Vælg det svar der passer bedst — og gå videre.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mx-auto w-full max-w-6xl">
                    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Afsluttende overblik</p>
                    <div className="max-h-[75vh] overflow-auto rounded-3xl border border-border/70 bg-card/90 p-4 sm:p-6">
                      <div className="grid gap-3 lg:grid-cols-4">
                        {questions.map((question, index) => {
                          const selectedOptionId = selectedOptionIdByQuestionId[question.id] ?? "";
                          const selectedOption = question.options.find((option) => option.id === selectedOptionId) ?? null;
                          const selectedOptionIndex = question.options.findIndex((option) => option.id === selectedOptionId);

                          return (
                            <article key={question.id} className="rounded-xl border border-border/70 bg-background p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Spørgsmål {index + 1}</p>
                              <p className="mt-1 text-xs leading-relaxed text-foreground">{question.prompt}</p>
                              <div className="mt-3 flex items-center gap-2 text-xs">
                                {selectedOption ? (
                                  <>
                                    <span
                                      className={cn(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                                        selectedOptionIndex >= 0 ? LIKERT_NODE_TONES[selectedOptionIndex] : "border-border bg-muted",
                                      )}
                                    >
                                      <span className="h-2 w-2 rounded-full bg-current" />
                                    </span>
                                    <span className="font-semibold text-foreground">{selectedOption.label}</span>
                                  </>
                                ) : (
                                  <span className="font-medium text-destructive">Mangler svar</span>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>



              {!isFinalOverviewVisible ? <div className="hidden md:block" aria-hidden /> : null}
              {isFinalOverviewVisible ? (
                <aside className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Afslut test</p>
                  <p className="mt-2 text-sm text-muted-foreground">Din besvarelse er låst. Klik herunder for at afslutte og se din rapport.</p>
                  <div className="mt-4">
                    <Button type="button" onClick={handleCloseAssessment} disabled={!isReadyForSubmit || isCompletingAssessment || submitting} className="w-full">
                      {isCompletingAssessment || submitting ? "Gemmer..." : "Luk og se rapport"}
                    </Button>
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
