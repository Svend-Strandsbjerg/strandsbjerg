import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { ReturnToDiscButton } from "@/components/disc/return-to-disc-button";
import { getSharedDiscResultAccess } from "@/lib/disc-result-access";

type DiscResultSharePageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function DiscResultSharePage({ params }: DiscResultSharePageProps) {
  const { token } = await params;
  const access = await getSharedDiscResultAccess(token);

  if (access.status === "missing") {
    notFound();
  }

  if (access.status === "expired") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Result link expired</h1>
        <p className="text-sm text-muted-foreground">This result link has expired. Please ask the recruiter to send a new result link.</p>
      </div>
    );
  }

  const assessment = access.sharedResult.assessment;
  const companyName = assessment.company?.name;
  const candidateLabel = assessment.candidateName ?? assessment.candidateEmail ?? undefined;
  const isCompleted = Boolean(assessment.submittedAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <header className="space-y-3 border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">DISC Profile Result</h1>
        <p className="text-sm text-muted-foreground">
          DISC highlights how people tend to communicate, make decisions, and collaborate at work.
        </p>
        <div className="space-y-1">
          {companyName ? <p className="text-sm text-muted-foreground">You have been invited by {companyName}.</p> : null}
          {candidateLabel ? <p className="text-sm font-medium text-foreground">Candidate: {candidateLabel}</p> : null}
        </div>
      </header>

      {isCompleted ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h2 className="text-base font-semibold text-emerald-900">Your DISC assessment has been completed</h2>
          <p className="mt-1 text-sm text-emerald-900/90">
            {companyName ? `The company (${companyName}) can now review your result.` : "The company can now review your result."}
          </p>
          <p className="mt-2 text-xs text-emerald-800/90">You can return to this page anytime using this link.</p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">This secure link provides view-only access to a completed DISC assessment.</p>
        <Link
          href={`/disc/result/${token}/pdf`}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Download PDF
        </Link>
        <ReturnToDiscButton />
      </div>

      <DiscResultPresentation
        title="Assessment report"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        identityLabel={candidateLabel}
        companyLabel={companyName}
        footerNote="This assessment was generated using the DISC framework."
      />
    </div>
  );
}
