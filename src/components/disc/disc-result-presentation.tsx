import { Button } from "@/components/ui/button";
import { buildDiscInsights } from "@/lib/disc-result-insights";

type ResponseRecord = Record<string, unknown>;

type DiscResultPresentationProps = {
  title: string;
  status: "STARTED" | "SUBMITTED" | "FAILED";
  createdAt: Date;
  submittedAt: Date | null;
  rawResponses: unknown;
  externalSessionId?: string;
  identityLabel?: string;
  companyLabel?: string;
  emptyMessage?: string;
  footerNote?: string;
  pdfHref?: string;
};

const DISC_DIMENSIONS = [
  { key: "D", label: "Dominance", color: "bg-red-500", lightColor: "bg-red-100", textColor: "text-red-900" },
  { key: "I", label: "Influence", color: "bg-yellow-400", lightColor: "bg-yellow-100", textColor: "text-yellow-900" },
  { key: "S", label: "Steadiness", color: "bg-green-500", lightColor: "bg-green-100", textColor: "text-green-900" },
  { key: "C", label: "Conscientiousness", color: "bg-blue-500", lightColor: "bg-blue-100", textColor: "text-blue-900" },
] as const;

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function getDimensionSamples(records: ResponseRecord[]) {
  const samples: Array<{ dimension: string; value: string }> = [];

  for (const entry of records) {
    const dimension =
      (typeof entry.dimension === "string" && entry.dimension) ||
      (typeof entry.trait === "string" && entry.trait) ||
      (typeof entry.questionId === "string" && entry.questionId)
        ? String(entry.dimension ?? entry.trait ?? entry.questionId)
        : null;

    const rawValue = entry.value;
    const value = typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : null;

    if (dimension && value) {
      samples.push({ dimension, value });
    }

    if (samples.length >= 6) {
      break;
    }
  }

  return samples;
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function DiscQuadrant({ dimensionCounts }: { dimensionCounts: { D: number; I: number; S: number; C: number } }) {
  const maxScore = Math.max(dimensionCounts.D, dimensionCounts.I, dimensionCounts.S, dimensionCounts.C, 1);
  const cells = [
    { key: "D", x: 1, y: 0 },
    { key: "I", x: 0, y: 0 },
    { key: "S", x: 0, y: 1 },
    { key: "C", x: 1, y: 1 },
  ] as const;

  const weightedX = (dimensionCounts.D + dimensionCounts.C) / (dimensionCounts.D + dimensionCounts.I + dimensionCounts.S + dimensionCounts.C || 1);
  const weightedY = (dimensionCounts.S + dimensionCounts.C) / (dimensionCounts.D + dimensionCounts.I + dimensionCounts.S + dimensionCounts.C || 1);

  return (
    <section className="rounded-xl border border-border/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">DISC visualization</h4>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto grid h-52 w-52 grid-cols-2 grid-rows-2 overflow-hidden rounded-2xl border border-border/70">
          {cells.map((cell) => {
            const dim = DISC_DIMENSIONS.find((entry) => entry.key === cell.key);
            const score = dimensionCounts[cell.key];
            const intensity = Math.max(0.3, Math.min(1, score / maxScore));

            return (
              <div
                key={cell.key}
                className={`${dim?.lightColor ?? "bg-muted"} flex items-center justify-center border border-background/40`}
                style={{ opacity: 0.5 + intensity * 0.5 }}
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{cell.key}</p>
                  <p className="text-xs font-medium text-muted-foreground">{score.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow"
            style={{ left: `${weightedX * 100}%`, top: `${weightedY * 100}%` }}
            aria-hidden
          />
        </div>

        <ul className="grid gap-2 text-sm">
          {DISC_DIMENSIONS.map((dimension) => (
            <li key={dimension.key} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${dimension.color}`} />
                <span className="font-medium">{dimension.key} · {dimension.label}</span>
              </div>
              <span className="text-muted-foreground">{dimensionCounts[dimension.key].toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DiscResultPresentation({
  title,
  status,
  createdAt,
  submittedAt,
  rawResponses,
  externalSessionId,
  identityLabel,
  companyLabel,
  emptyMessage,
  footerNote,
  pdfHref,
}: DiscResultPresentationProps) {
  const { records, interpretationText, dominantInsight, secondaryInsight, dimensionCounts, qualityIndicators, canonicalResult } = buildDiscInsights(rawResponses);
  const dimensionSamples = getDimensionSamples(records);
  const completionDate = submittedAt ?? (status === "SUBMITTED" ? createdAt : null);
  const qualityIndicatorEntries = qualityIndicators ? Object.entries(qualityIndicators) : [];
  const renderedViewModel = {
    status,
    dimensionCounts,
    primaryDimension: canonicalResult?.primaryDimension ?? null,
    secondaryDimension: canonicalResult?.secondaryDimension ?? null,
    lifecycleStatus: canonicalResult?.lifecycleStatus ?? null,
    qualityIndicatorKeys: qualityIndicatorEntries.map(([key]) => key),
  };

  console.info(
    JSON.stringify({
      event: "disc_result_render_payload",
      rawEngineResultPayload: rawResponses,
      mappedLocalResult: canonicalResult,
      finalRenderedViewModel: renderedViewModel,
      hasEngineResult: Boolean(canonicalResult),
      hasDimensions: Boolean((canonicalResult as Record<string, unknown> | null)?.dimensions),
      hasProfileSummary: typeof (canonicalResult as Record<string, unknown> | null)?.profileSummary === "string",
      hasQualityIndicators: qualityIndicatorEntries.length > 0,
      dimensionCounts,
    }),
  );

  if (status !== "SUBMITTED") {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground">This assessment is {status.toLowerCase()} and does not have a completed result view yet.</p>
      </div>
    );
  }

  if (records.length === 0 && !interpretationText) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground">{emptyMessage ?? "Result data is incomplete. Please contact support if this persists."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {identityLabel ? `${identityLabel} · ` : ""}Completed on {formatDate(completionDate)} · Status: {status.toLowerCase()}
        </p>
        {companyLabel ? <p className="mt-1 text-xs text-muted-foreground/90">Shared by {companyLabel}</p> : null}
      </div>

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your profile summary</h4>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {dominantInsight
            ? `${dominantInsight.label} appears most prominent in this result${secondaryInsight ? `, with support from ${secondaryInsight.label}` : ""}.`
            : "A completed response set is available, but a dominant DISC dimension could not be inferred from the current payload."}
        </p>
        {dominantInsight ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{dominantInsight.summary}</p> : null}
        {interpretationText ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{interpretationText}</p> : null}
      </section>

      <DiscQuadrant dimensionCounts={dimensionCounts} />

      {dominantInsight ? (
        <>
          <section className="rounded-xl border border-border/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Strengths</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              {dominantInsight.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Potential challenges</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              {dominantInsight.challenges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">How you communicate</h4>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{dominantInsight.communication}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">How you work best</h4>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{dominantInsight.workStyle}</p>
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Metadata</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Created: {formatDate(createdAt)}</li>
          <li>Completed: {formatDate(completionDate)}</li>
          <li>Response count: {records.length}</li>
          <li>Primary dimension: {renderValue(canonicalResult?.primaryDimension)}</li>
          <li>Secondary dimension: {renderValue(canonicalResult?.secondaryDimension)}</li>
          <li>Lifecycle status: {renderValue(canonicalResult?.lifecycleStatus)}</li>
        </ul>
        {pdfHref ? (
          <div className="mt-3">
            <Button asChild variant="outline" className="h-8 text-xs">
              <a href={pdfHref}>Download PDF report</a>
            </Button>
          </div>
        ) : null}
        {qualityIndicatorEntries.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {qualityIndicatorEntries.slice(0, 6).map(([key, value]) => (
              <li key={key}>
                Quality · {key}: <span className="font-medium text-foreground">{renderValue(value)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {externalSessionId ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">Technical details</summary>
            <p className="mt-2 break-all text-xs text-muted-foreground">Session ID: {externalSessionId}</p>
          </details>
        ) : null}
      </section>

      {dimensionSamples.length > 0 ? (
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile traits / dimensions</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {dimensionSamples.map((item) => (
              <li key={`${item.dimension}:${item.value}`}>
                {item.dimension}: <span className="font-medium text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {footerNote ? <p className="px-1 text-xs text-muted-foreground">{footerNote}</p> : null}
    </div>
  );
}
