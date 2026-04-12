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

function normalizeResponseRecords(rawResponses: unknown): ResponseRecord[] {
  if (Array.isArray(rawResponses)) {
    return rawResponses.filter((entry): entry is ResponseRecord => Boolean(entry) && typeof entry === "object");
  }

  if (rawResponses && typeof rawResponses === "object" && Array.isArray((rawResponses as { responses?: unknown }).responses)) {
    return (rawResponses as { responses: unknown[] }).responses.filter(
      (entry): entry is ResponseRecord => Boolean(entry) && typeof entry === "object",
    );
  }

  return [];
}

function getInterpretationText(rawResponses: unknown) {
  if (!rawResponses || typeof rawResponses !== "object") {
    return null;
  }

  const candidates = ["interpretation", "summary", "profileSummary", "resultText"] as const;

  for (const key of candidates) {
    const value = (rawResponses as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getProfileTraits(records: ResponseRecord[]) {
  const valueCounts = new Map<string, number>();

  for (const entry of records) {
    const rawValue = entry.value;
    if (typeof rawValue === "string" || typeof rawValue === "number") {
      const key = String(rawValue).trim();
      if (key) {
        valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return [...valueCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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
  const records = normalizeResponseRecords(rawResponses);
  const interpretationText = getInterpretationText(rawResponses);
  const profileTraits = getProfileTraits(records);
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

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Summary</h4>
          <p className="mt-2 text-sm text-muted-foreground">{records.length} responses captured for this completed assessment.</p>
          {profileTraits.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {profileTraits.slice(0, 3).map((item) => (
                <li key={item.label}>
                  <span className="font-medium">{item.label}</span>: {item.count}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Metadata</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Created: {formatDate(createdAt)}</li>
            <li>Completed: {formatDate(completionDate)}</li>
            <li>Response count: {records.length}</li>
          </ul>
          {externalSessionId ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">Technical details</summary>
              <p className="mt-2 break-all text-xs text-muted-foreground">Session ID: {externalSessionId}</p>
            </details>
          ) : null}
        </section>
      </div>

      {profileTraits.length > 0 ? (
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile traits / dimensions</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profileTraits.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 p-2 text-sm">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">Observed {item.count} time{item.count === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {dimensionSamples.length > 0 ? (
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dimension sample</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {dimensionSamples.map((item) => (
              <li key={`${item.dimension}:${item.value}`}>
                {item.dimension}: <span className="font-medium text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {interpretationText ? (
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Interpretation</h4>
          <p className="mt-2 text-sm text-muted-foreground">{interpretationText}</p>
        </section>
      ) : null}
    </div>
  );
}
