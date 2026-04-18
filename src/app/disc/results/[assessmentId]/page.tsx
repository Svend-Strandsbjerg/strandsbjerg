import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { requireUser } from "@/lib/access";
import { getPersonalDiscResultAccess } from "@/lib/disc-result-access";
import { ensureAssessmentResultShare } from "@/lib/disc-result-share";

type PersonalDiscResultPageProps = {
  params: Promise<{ assessmentId: string }>;
};

export const dynamic = "force-dynamic";

export default async function PersonalDiscResultPage({ params }: PersonalDiscResultPageProps) {
  const user = await requireUser();
  const { assessmentId } = await params;
  const access = await getPersonalDiscResultAccess(user.id, assessmentId);

  if (access.status !== "ok") {
    notFound();
  }

  const assessment = access.assessment;
  const share = assessment.status === "SUBMITTED" ? await ensureAssessmentResultShare(assessment.id) : null;
  const wasPromoGenerated = Boolean(assessment.promoRedemptionId);

  return (
    <div className="mx-auto max-w-4xl space-y-5 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <header className="space-y-2 border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your DISC profile</h1>
        <p className="text-sm text-muted-foreground">A saved personal DISC result you can revisit and export any time.</p>
      </header>

      {wasPromoGenerated ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h2 className="text-base font-semibold text-emerald-900">Your free DISC profile is complete</h2>
          <p className="mt-1 text-sm text-emerald-900/90">This result has been generated from your promo session and saved to your account.</p>
        </section>
      ) : null}

      <DiscResultPresentation
        title="DISC profile"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        pdfHref={share ? `/disc/result/${share.token}/pdf` : undefined}
        footerNote="Use this profile as a practical guide for communication, planning, and collaboration."
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/disc/overview"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Back to DISC overview
        </Link>
      </div>
    </div>
  );
}
