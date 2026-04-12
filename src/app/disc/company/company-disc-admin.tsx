"use client";

import { useActionState, useState } from "react";

import {
  createAssessmentInvite,
  initialCompanyInviteActionState,
  invalidateAssessmentInvite,
} from "@/app/disc/company/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CompanyDiscAdminProps = {
  companies: Array<{
    id: string;
    name: string;
    invites: Array<{
      id: string;
      token: string;
      candidateName: string | null;
      candidateEmail: string | null;
      status: "ACTIVE" | "COMPLETED" | "INVALIDATED";
      expiresAt: Date;
      createdAt: Date;
    }>;
    assessments: Array<{
      id: string;
      externalSessionId: string;
      candidateName: string | null;
      candidateEmail: string | null;
      userId: string | null;
      submittedAt: Date | null;
      createdAt: Date;
      status: "STARTED" | "SUBMITTED" | "FAILED";
      rawResponses: unknown;
    }>;
  }>;
  origin: string;
};

function InviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[320px] truncate text-xs text-muted-foreground">{link}</span>
      <Button
        type="button"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function CompanyDiscAdmin({ companies, origin }: CompanyDiscAdminProps) {
  const [createState, createAction] = useActionState(createAssessmentInvite, initialCompanyInviteActionState);
  const [invalidateState, invalidateAction] = useActionState(invalidateAssessmentInvite, initialCompanyInviteActionState);
  const infoState = invalidateState.status !== "idle" ? invalidateState : createState;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Company DISC invites</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create invite links, track candidates, and view completed assessments.</p>
        {infoState.status !== "idle" ? (
          <p className={infoState.status === "success" ? "mt-2 text-sm text-emerald-700" : "mt-2 text-sm text-destructive"}>{infoState.message}</p>
        ) : null}
      </div>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-5 text-sm text-muted-foreground">
          You do not have recruiter/admin membership in any company yet.
        </div>
      ) : null}

      {companies.map((company) => (
        <section key={company.id} className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight">{company.name}</h2>

          <form action={createAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="companyId" value={company.id} />
            <Input name="candidateName" placeholder="Candidate name" />
            <Input name="candidateEmail" type="email" placeholder="Candidate email" />
            <Input name="expiresInDays" type="number" min={1} max={30} defaultValue={7} />
            <Button type="submit">Create invite</Button>
          </form>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invites</h3>
            {company.invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites yet.</p>
            ) : (
              <div className="space-y-3">
                {company.invites.map((invite) => {
                  const link = `${origin}/disc/invite/${invite.token}`;

                  return (
                    <div key={invite.id} className="rounded-xl border border-border/80 p-3 text-sm">
                      <p>
                        {invite.candidateName ?? "Unnamed candidate"} · {invite.candidateEmail ?? "No email"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {invite.status.toLowerCase()} · Expires: {invite.expiresAt.toISOString().slice(0, 10)}
                      </p>
                      <InviteLink link={link} />
                      {invite.status === "ACTIVE" ? (
                        <form action={invalidateAction} className="mt-2">
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <input type="hidden" name="companyId" value={company.id} />
                          <Button type="submit" variant="outline" className="h-8 text-xs">
                            Invalidate
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Completed assessments</h3>
            {company.assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed assessments yet.</p>
            ) : (
              <div className="space-y-3">
                {company.assessments.map((assessment, index) => (
                  <DiscResultPresentation
                    key={assessment.id}
                    title={`Company result #${company.assessments.length - index}`}
                    status={assessment.status}
                    createdAt={assessment.createdAt}
                    submittedAt={assessment.submittedAt}
                    rawResponses={assessment.rawResponses}
                    externalSessionId={assessment.externalSessionId}
                    identityLabel={
                      assessment.candidateName ?? assessment.candidateEmail ?? (assessment.userId ? `User ${assessment.userId}` : "Candidate")
                    }
                    emptyMessage="This submitted assessment has no readable response payload yet."
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
