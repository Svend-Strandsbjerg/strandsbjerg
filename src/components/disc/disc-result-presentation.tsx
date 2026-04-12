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

type DiscDimension = "D" | "I" | "S" | "C";

type DimensionInsight = {
  label: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  communication: string;
  workStyle: string;
};

const DISC_DIMENSION_MAP: Record<DiscDimension, DimensionInsight> = {
  D: {
    label: "Dominance (D)",
    summary: "Direct, results-oriented, and comfortable taking charge in uncertain situations.",
    strengths: ["Moves quickly toward decisions", "Takes ownership under pressure", "Challenges blockers to keep momentum"],
    challenges: ["May appear too blunt in sensitive conversations", "Can overlook consensus when speed is prioritized"],
    communication: "Prefers concise communication focused on outcomes, decisions, and clear priorities.",
    workStyle: "Works best with autonomy, ambitious targets, and room to lead execution.",
  },
  I: {
    label: "Influence (I)",
    summary: "Engaging, persuasive, and energized by collaboration and visible progress.",
    strengths: ["Builds rapport quickly", "Motivates teams with optimism", "Explains ideas in an accessible way"],
    challenges: ["May lose detail when moving fast", "Can overcommit when enthusiasm is high"],
    communication: "Responds well to conversational, positive dialogue with room for idea exchange.",
    workStyle: "Works best in collaborative environments with recognition, people contact, and creative problem-solving.",
  },
  S: {
    label: "Steadiness (S)",
    summary: "Reliable, patient, and focused on stability, support, and long-term consistency.",
    strengths: ["Creates dependable routines", "Supports team cohesion", "Remains calm in changing situations"],
    challenges: ["May delay difficult trade-off decisions", "Can resist abrupt change without context"],
    communication: "Prefers respectful, steady communication with clear expectations and practical next steps.",
    workStyle: "Works best with predictable processes, supportive teams, and clarity around responsibilities.",
  },
  C: {
    label: "Conscientiousness (C)",
    summary: "Analytical, quality-focused, and attentive to structure, standards, and risk.",
    strengths: ["Delivers high-quality output", "Identifies risks early", "Builds robust, well-structured solutions"],
    challenges: ["May overanalyze before acting", "Can become perfectionistic under tight deadlines"],
    communication: "Prefers precise, evidence-based communication with clear criteria and rationale.",
    workStyle: "Works best where quality standards are explicit and careful planning is valued.",
  },
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

function normalizeToDiscDimension(value: unknown): DiscDimension | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "D" || normalized === "DOMINANCE") {
    return "D";
  }

  if (normalized === "I" || normalized === "INFLUENCE") {
    return "I";
  }

  if (normalized === "S" || normalized === "STEADINESS") {
    return "S";
  }

  if (normalized === "C" || normalized === "CONSCIENTIOUSNESS" || normalized === "COMPLIANCE") {
    return "C";
  }

  return null;
}

function extractDimensionCounts(records: ResponseRecord[]) {
  const counts: Record<DiscDimension, number> = {
    D: 0,
    I: 0,
    S: 0,
    C: 0,
  };

  for (const entry of records) {
    const candidates = [entry.dimension, entry.trait, entry.value, entry.discDimension];

    for (const candidate of candidates) {
      const dimension = normalizeToDiscDimension(candidate);
      if (dimension) {
        counts[dimension] += 1;
        break;
      }
    }
  }

  return counts;
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
  const dimensionCounts = extractDimensionCounts(records);
  const rankedDimensions = (Object.entries(dimensionCounts) as Array<[DiscDimension, number]>).sort((a, b) => b[1] - a[1]);
  const dominantDimension = rankedDimensions[0]?.[1] > 0 ? rankedDimensions[0][0] : null;
  const secondaryDimension = rankedDimensions[1]?.[1] > 0 ? rankedDimensions[1][0] : null;
  const dominantInsight = dominantDimension ? DISC_DIMENSION_MAP[dominantDimension] : null;
  const secondaryInsight = secondaryDimension ? DISC_DIMENSION_MAP[secondaryDimension] : null;
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
