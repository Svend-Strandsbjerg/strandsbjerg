import { buildDiscResultViewModel } from "@/lib/disc-result-insights";

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

function formatDimensionValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
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
  const viewModel = buildDiscResultViewModel(rawResponses);
  const completionDate = submittedAt ?? (status === "SUBMITTED" ? createdAt : null);
  const qualityIndicatorEntries = Object.entries(viewModel.qualityIndicators);

  const renderedViewModel = {
    status,
    dimensions: viewModel.dimensionScores,
    primaryDimension: viewModel.primaryDimension,
    secondaryDimension: viewModel.secondaryDimension,
    lifecycleStatus: viewModel.lifecycleStatus,
    profileSummary: viewModel.profileSummary,
    qualityIndicatorKeys: qualityIndicatorEntries.map(([key]) => key),
  };

  console.info(
    JSON.stringify({
      event: "disc_result_render_payload",
      rawEngineResultPayload: rawResponses,
      mappedViewModel: renderedViewModel,
      hasEngineResult: Boolean(viewModel.canonicalResult),
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

  if (!viewModel.canonicalResult) {
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
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">DISC dimensions</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>D: <span className="font-medium text-foreground">{formatDimensionValue(viewModel.dimensionScores.D)}</span></li>
          <li>I: <span className="font-medium text-foreground">{formatDimensionValue(viewModel.dimensionScores.I)}</span></li>
          <li>S: <span className="font-medium text-foreground">{formatDimensionValue(viewModel.dimensionScores.S)}</span></li>
          <li>C: <span className="font-medium text-foreground">{formatDimensionValue(viewModel.dimensionScores.C)}</span></li>
        </ul>
      </section>

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your profile summary</h4>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{viewModel.profileSummary ?? "No profile summary was returned by disc-engine."}</p>
      </section>

      {qualityIndicatorEntries.length > 0 ? (
        <section className="rounded-xl border border-border/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quality indicators</h4>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {qualityIndicatorEntries.slice(0, 8).map(([key, value]) => (
              <li key={key}>
                {key}: <span className="font-medium text-foreground">{renderValue(value)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Metadata</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Created: {formatDate(createdAt)}</li>
          <li>Completed: {formatDate(completionDate)}</li>
          <li>Response count: {viewModel.responseCount}</li>
          <li>Primary dimension: {renderValue(viewModel.primaryDimension)}</li>
          <li>Secondary dimension: {renderValue(viewModel.secondaryDimension)}</li>
          <li>Lifecycle status: {renderValue(viewModel.lifecycleStatus)}</li>
        </ul>
        {externalSessionId ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">Technical details</summary>
            <p className="mt-2 break-all text-xs text-muted-foreground">Session ID: {externalSessionId}</p>
          </details>
        ) : null}
      </section>

      {footerNote ? <p className="px-1 text-xs text-muted-foreground">{footerNote}</p> : null}
    </div>
  );
}
