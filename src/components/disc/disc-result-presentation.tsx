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
  emptyMessage?: string;
};

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

export function DiscResultPresentation({
  title,
  status,
  createdAt,
  submittedAt,
  rawResponses,
  externalSessionId,
  identityLabel,
  emptyMessage,
}: DiscResultPresentationProps) {
  const { records, interpretationText, dominantInsight, secondaryInsight, dimensionCounts } = buildDiscInsights(rawResponses);
  const dimensionSamples = getDimensionSamples(records);
  const completionDate = submittedAt ?? (status === "SUBMITTED" ? createdAt : null);

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
      </div>

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your profile summary</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          {dominantInsight
            ? `${dominantInsight.label} appears most prominent in this result${secondaryInsight ? `, with support from ${secondaryInsight.label}` : ""}.`
            : "A completed response set is available, but a dominant DISC dimension could not be inferred from the current payload."}
        </p>
        {dominantInsight ? <p className="mt-2 text-sm text-muted-foreground">{dominantInsight.summary}</p> : null}
        {interpretationText ? <p className="mt-2 text-sm text-muted-foreground">{interpretationText}</p> : null}
      </section>

      {dominantInsight ? (
        <>
          <section className="rounded-xl border border-border/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Strengths</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {dominantInsight.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Potential challenges</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {dominantInsight.challenges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">How you communicate</h4>
              <p className="mt-2 text-sm text-muted-foreground">{dominantInsight.communication}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">How you work best</h4>
              <p className="mt-2 text-sm text-muted-foreground">{dominantInsight.workStyle}</p>
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
          <li>
            DISC signals: D {dimensionCounts.D} · I {dimensionCounts.I} · S {dimensionCounts.S} · C {dimensionCounts.C}
          </li>
        </ul>
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
    </div>
  );
}
