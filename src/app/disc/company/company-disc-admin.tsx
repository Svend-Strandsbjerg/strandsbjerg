"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createAssessmentInvite,
  initialCompanyInviteActionState,
  invalidateAssessmentInvite,
  resendAssessmentInviteEmail,
  resendAssessmentResultEmail,
} from "@/app/disc/company/actions";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      assessments: Array<{
        id: string;
        submittedAt: Date | null;
        resultShare: {
          token: string;
        } | null;
      }>;
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
      resultShare: {
        token: string;
        expiresAt: Date | null;
      } | null;
    }>;
  }>;
  origin: string;
};

type CompanyFilterStatus = "all" | "pending" | "completed";

function CopyLinkButton({ link }: { link: string }) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="h-8 text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopyState("success");
          } catch {
            setCopyState("error");
          }

          setTimeout(() => setCopyState("idle"), 2200);
        }}
      >
        {copyState === "success" ? "Copied ✓" : copyState === "error" ? "Copy failed" : "Copy link"}
      </Button>
      {copyState === "success" ? <p className="text-[11px] text-emerald-700">Next: paste it in your message to the candidate.</p> : null}
      {copyState === "error" ? <p className="text-[11px] text-destructive">Could not access your clipboard. Copy manually from the invite URL.</p> : null}
    </div>
  );
}

export function CompanyDiscAdmin({ companies, origin }: CompanyDiscAdminProps) {
  const [createState, createAction] = useActionState(createAssessmentInvite, initialCompanyInviteActionState);
  const [invalidateState, invalidateAction] = useActionState(invalidateAssessmentInvite, initialCompanyInviteActionState);
  const [resendInviteState, resendInviteAction] = useActionState(resendAssessmentInviteEmail, initialCompanyInviteActionState);
  const [resendState, resendAction] = useActionState(resendAssessmentResultEmail, initialCompanyInviteActionState);
  const [statusFilter, setStatusFilter] = useState<CompanyFilterStatus>("all");
  const [lastCreatedCompanyId, setLastCreatedCompanyId] = useState<string | null>(null);
  const infoState = useMemo(() => {
    if (resendState.status !== "idle") {
      return resendState;
    }

    if (resendInviteState.status !== "idle") {
      return resendInviteState;
    }

    if (invalidateState.status !== "idle") {
      return invalidateState;
    }

    return createState;
  }, [createState, invalidateState, resendInviteState, resendState]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Company DISC invites</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create invite links, track candidates, and view completed assessments.</p>
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">How to use</p>
          <p className="mt-2 text-sm text-muted-foreground">Create an invite and send it to your candidate.</p>
          <p className="text-sm text-muted-foreground">They complete the DISC assessment from the secure link.</p>
          <p className="text-sm text-muted-foreground">As soon as it is submitted, open the result and review or share it.</p>
        </div>
        {infoState.status !== "idle" ? (
          <div
            className={cn(
              "mt-3 rounded-xl border p-3 text-sm",
              infoState.status === "success" ? "border-emerald-200 bg-emerald-50/70 text-emerald-900" : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            <p className="font-medium">{infoState.message}</p>
            {infoState.status === "success" ? (
              <p className="mt-1 text-xs text-emerald-800/90">
                {infoState.message.includes("email sent")
                  ? "Confirmation: the email was sent. You can still copy the link below if needed."
                  : "Next step: share the invite link with your candidate. You&apos;ll see a result-ready status after they submit."}
              </p>
            ) : null}
          </div>
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

          <form id={`create-invite-${company.id}`} action={createAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="companyId" value={company.id} />
            <Input name="candidateName" placeholder="Candidate name" />
            <Input name="candidateEmail" type="email" placeholder="Candidate email" />
            <Input name="expiresInDays" type="number" min={1} max={30} defaultValue={7} />
            <div className="md:col-span-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="sendInviteEmail" className="h-4 w-4" />
                Send invite email to candidate
              </label>
              <Button type="submit" onClick={() => setLastCreatedCompanyId(company.id)}>
                Create invite
              </Button>
            </div>
          </form>

          {(() => {
            const now = Date.now();
            const rows = company.invites.map((invite) => {
              const latestAssessment = invite.assessments[0] ?? null;
              const isCompleted = invite.status === "COMPLETED" || Boolean(latestAssessment);
              const isExpired = !isCompleted && invite.expiresAt.getTime() <= now;
              const mappedStatus = isCompleted ? "completed" : isExpired ? "expired" : "pending";

              return {
                ...invite,
                mappedStatus,
                latestAssessment,
              };
            });
            const filteredRows = rows.filter((row) => (statusFilter === "all" ? true : row.mappedStatus === statusFilter));
            const totalInvites = rows.length;
            const pendingInvites = rows.filter((row) => row.mappedStatus === "pending").length;
            const completedAssessments = rows.filter((row) => row.mappedStatus === "completed").length;
            const latestInvite = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
            const showFirstInviteSuccess = createState.status === "success" && lastCreatedCompanyId === company.id && totalInvites === 1 && latestInvite;
            const firstInviteLink = latestInvite ? `${origin}/disc/invite/${latestInvite.token}` : null;

            return (
              <>
                {showFirstInviteSuccess && firstInviteLink ? (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-sm font-semibold text-emerald-900">Your first invite is ready.</p>
                    <p className="mt-1 text-sm text-emerald-900/90">Send this link to your candidate to start the DISC assessment:</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="max-w-full overflow-x-auto rounded-md bg-background px-2 py-1 text-xs text-foreground">{firstInviteLink}</code>
                      <CopyLinkButton link={firstInviteLink} />
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total invites</p>
                    <p className="mt-1 text-2xl font-semibold">{totalInvites}</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pending invites</p>
                    <p className="mt-1 text-2xl font-semibold">{pendingInvites}</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Completed assessments</p>
                    <p className="mt-1 text-2xl font-semibold">{completedAssessments}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Candidates</h3>
                    <div className="inline-flex rounded-full border border-border/80 bg-background p-1">
                      {(["all", "pending", "completed"] as CompanyFilterStatus[]).map((filterValue) => (
                        <button
                          key={filterValue}
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
                            statusFilter === filterValue ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => setStatusFilter(filterValue)}
                        >
                          {filterValue}
                        </button>
                      ))}
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-background/40 p-6 text-center">
                      <p className="text-base font-medium">No invites yet</p>
                      <p className="mt-2 text-sm text-muted-foreground">Create DISC assessments for candidates and send them a link</p>
                      <a
                        href={`#create-invite-${company.id}`}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                      >
                        Create your first invite
                      </a>
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No candidates match the current status filter.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border/80">
                      <table className="min-w-full divide-y divide-border/80 text-sm">
                        <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Candidate</th>
                            <th className="px-3 py-2 font-medium">Email</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Created</th>
                            <th className="px-3 py-2 font-medium">Completed</th>
                            <th className="px-3 py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {filteredRows.map((row) => {
                            const inviteLink = `${origin}/disc/invite/${row.token}`;
                            const completionDate = row.latestAssessment?.submittedAt;
                            const resultLink = row.latestAssessment?.resultShare?.token
                              ? `${origin}/disc/result/${row.latestAssessment.resultShare.token}`
                              : null;
                            const isFreshCompletion = Boolean(completionDate && now - completionDate.getTime() <= 1000 * 60 * 60 * 24 * 3);

                            return (
                              <tr key={row.id} className={cn(row.mappedStatus === "completed" ? "bg-emerald-50/40" : undefined)}>
                                <td className="px-3 py-3">{row.candidateName ?? "Unnamed candidate"}</td>
                                <td className="px-3 py-3 text-muted-foreground">{row.candidateEmail ?? "No email"}</td>
                                <td className="px-3 py-3 capitalize">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                      row.mappedStatus === "completed"
                                        ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                        : row.mappedStatus === "pending"
                                          ? "border-amber-300 bg-amber-100 text-amber-900"
                                          : "border-border bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {row.mappedStatus}
                                  </span>
                                  {row.mappedStatus === "pending" ? (
                                    <p className="mt-1 text-[11px] normal-case text-muted-foreground">Waiting for candidate submission.</p>
                                  ) : null}
                                  {isFreshCompletion ? (
                                    <p className="mt-1 text-[11px] normal-case font-medium text-emerald-700">New result ready for review.</p>
                                  ) : null}
                                  {row.mappedStatus === "completed" && !isFreshCompletion ? (
                                    <p className="mt-1 text-[11px] normal-case text-emerald-700">Result ready.</p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">{row.createdAt.toISOString().slice(0, 10)}</td>
                                <td className="px-3 py-3 text-muted-foreground">{completionDate ? completionDate.toISOString().slice(0, 10) : "—"}</td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <CopyLinkButton link={inviteLink} />

                                    {row.mappedStatus === "completed" ? (
                                      row.latestAssessment ? (
                                        <form action={resendAction}>
                                          <input type="hidden" name="companyId" value={company.id} />
                                          <input type="hidden" name="assessmentId" value={row.latestAssessment.id} />
                                          <Button type="submit" variant="outline" className="h-8 text-xs">
                                            Resend result email
                                          </Button>
                                        </form>
                                      ) : null
                                    ) : (
                                      <form action={resendInviteAction}>
                                        <input type="hidden" name="companyId" value={company.id} />
                                        <input type="hidden" name="inviteId" value={row.id} />
                                        <Button type="submit" variant="outline" className="h-8 text-xs" disabled={!row.candidateEmail}>
                                          Resend invite email
                                        </Button>
                                      </form>
                                    )}

                                    {resultLink ? (
                                      <a
                                        href={resultLink}
                                        className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open result
                                      </a>
                                    ) : null}

                                    {row.mappedStatus === "pending" ? (
                                      <form action={invalidateAction}>
                                        <input type="hidden" name="inviteId" value={row.id} />
                                        <input type="hidden" name="companyId" value={company.id} />
                                        <Button type="submit" variant="outline" className="h-8 text-xs">
                                          Invalidate
                                        </Button>
                                      </form>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Completed assessments</h3>
            {company.assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed assessments yet.</p>
            ) : (
              <div className="space-y-3">
                {company.assessments.map((assessment, index) => {
                  const resultLink = assessment.resultShare ? `${origin}/disc/result/${assessment.resultShare.token}` : null;
                  const isFreshCompletion = Boolean(
                    assessment.submittedAt && Date.now() - assessment.submittedAt.getTime() <= 1000 * 60 * 60 * 24 * 3,
                  );

                  return (
                    <div
                      key={assessment.id}
                      className={cn(
                        "space-y-2 rounded-2xl border p-3",
                        isFreshCompletion ? "border-emerald-300 bg-emerald-50/40" : "border-border/70",
                      )}
                    >
                      {isFreshCompletion ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">New completion</p>
                      ) : null}
                      <DiscResultPresentation
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

                      <div className="flex flex-wrap items-center gap-2">
                        {resultLink ? (
                          <>
                            <CopyLinkButton link={resultLink} />
                            <form action={resendAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="assessmentId" value={assessment.id} />
                              <Button type="submit" variant="outline" className="h-8 text-xs">
                                Send result email
                              </Button>
                            </form>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Result link becomes available after completion is processed.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
