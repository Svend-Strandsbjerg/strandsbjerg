import { buildDiscProfileSummary, buildDiscResultViewModel, calculateDiscPosition } from "@/lib/disc-result-insights";
import { cn } from "@/lib/utils";

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

function formatDimensionValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatPercent(value: number) {
  return `${Math.round(((value + 1) / 2) * 100)}%`;
}

function DiscSquare({ x, y }: { x: number; y: number }) {
  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-b border-r border-border/60 bg-red-500/20 p-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-900">D</div>
          <div className="border-b border-border/60 bg-yellow-400/30 p-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-yellow-900">I</div>
          <div className="border-r border-border/60 bg-blue-500/20 p-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">C</div>
          <div className="bg-green-500/20 p-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-green-900">S</div>
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-foreground/25" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-foreground/25" />
        </div>
        <div
          className={cn(
            "absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-[0_0_0_3px_rgba(15,23,42,0.25)]",
            "dark:border-slate-100 dark:bg-slate-50 dark:shadow-[0_0_0_3px_rgba(248,250,252,0.35)]",
          )}
          style={{ left: formatPercent(x), top: formatPercent(-y) }}
          aria-label="DISC placement marker"
        />
      </div>
    </div>
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
  const viewModel = buildDiscResultViewModel(rawResponses);
  const profileSummary = buildDiscProfileSummary(viewModel);
  const placement = calculateDiscPosition(viewModel.dimensionScores);
  const completionDate = submittedAt ?? (status === "SUBMITTED" ? createdAt : null);

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
          {identityLabel ? `${identityLabel} · ` : ""}Completed on {formatDate(completionDate)}
        </p>
        {companyLabel ? <p className="mt-1 text-xs text-muted-foreground/90">Shared by {companyLabel}</p> : null}
      </div>

      <section className="rounded-xl border border-border/70 p-4 sm:p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">DISC overview</h4>
        <div className="mt-4 grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vægtning</h5>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between"><span className="text-muted-foreground">D</span><span className="font-semibold text-foreground">{formatDimensionValue(viewModel.dimensionScores.D)}</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">I</span><span className="font-semibold text-foreground">{formatDimensionValue(viewModel.dimensionScores.I)}</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">S</span><span className="font-semibold text-foreground">{formatDimensionValue(viewModel.dimensionScores.S)}</span></li>
              <li className="flex items-center justify-between"><span className="text-muted-foreground">C</span><span className="font-semibold text-foreground">{formatDimensionValue(viewModel.dimensionScores.C)}</span></li>
            </ul>
          </div>
          <DiscSquare x={placement.x} y={placement.y} />
        </div>
      </section>

      <section className="rounded-xl border border-border/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile summary</h4>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{profileSummary}</p>
      </section>

      {pdfHref ? (
        <div className="px-1">
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Download PDF report
          </a>
        </div>
      ) : null}

      {footerNote ? <p className="px-1 text-xs text-muted-foreground">{footerNote}</p> : null}
    </div>
  );
}
