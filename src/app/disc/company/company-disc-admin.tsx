"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createAssessmentInvite,
  initialCompanyInviteActionState,
  invalidateAssessmentInvite,
  resendAssessmentInviteEmail,
  resendAssessmentResultEmail,
} from "@/app/disc/company/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveInviteLifecycleStatus, toInviteStatusLabel, type InviteLifecycleStatus } from "@/lib/disc-invite-status";
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
      createdByUser: {
        name: string | null;
        email: string | null;
      };
      assessments: Array<{
        id: string;
        status: "STARTED" | "SUBMITTED" | "FAILED";
        createdAt: Date;
        submittedAt: Date | null;
        userId: string | null;
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

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("da-DK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function CopyLinkButton({ link }: { link: string }) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  return (
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
      {copyState === "success" ? "Kopieret ✓" : copyState === "error" ? "Kunne ikke kopiere" : "Kopiér link"}
    </Button>
  );
}

function statusTone(status: InviteLifecycleStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "started":
      return "border-sky-300 bg-sky-100 text-sky-900";
    case "pending":
      return "border-amber-300 bg-amber-100 text-amber-900";
    case "expired":
    case "closed":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-background text-foreground";
  }
}

export function CompanyDiscAdmin({ companies, origin }: CompanyDiscAdminProps) {
  const [createState, createAction] = useActionState(createAssessmentInvite, initialCompanyInviteActionState);
  const [invalidateState, invalidateAction] = useActionState(invalidateAssessmentInvite, initialCompanyInviteActionState);
  const [resendInviteState, resendInviteAction] = useActionState(resendAssessmentInviteEmail, initialCompanyInviteActionState);
  const [resendState, resendAction] = useActionState(resendAssessmentResultEmail, initialCompanyInviteActionState);
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
        <h1 className="text-2xl font-semibold tracking-tight">Virksomheds-overblik · DISC</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrér invitationer, følg kandidaternes status, og gå direkte til resultater.
        </p>
        {infoState.status !== "idle" ? (
          <div
            className={cn(
              "mt-4 rounded-xl border p-3 text-sm",
              infoState.status === "success" ? "border-emerald-200 bg-emerald-50/70 text-emerald-900" : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {infoState.message}
          </div>
        ) : null}
      </div>

      {companies.map((company) => {
        const rows = company.invites.map((invite) => {
          const latestAssessment = invite.assessments[0] ?? null;
          const claimedAt = latestAssessment?.createdAt ?? null;
          const completedAt = latestAssessment?.submittedAt ?? null;
          const lifecycleStatus = deriveInviteLifecycleStatus({
            inviteStatus: invite.status,
            expiresAt: invite.expiresAt,
            claimedAt,
            completedAt,
            latestAssessmentStatus: latestAssessment?.status ?? null,
          });

          return {
            ...invite,
            latestAssessment,
            claimedAt,
            completedAt,
            lifecycleStatus,
          };
        });

        const statusBuckets: Array<{ title: string; statuses: InviteLifecycleStatus[]; description: string }> = [
          { title: "Ikke startet", statuses: ["created", "pending"], description: "Invitation sendt, men kandidaten er ikke startet." },
          { title: "Startet", statuses: ["started"], description: "Kandidaten har claimet invitationen og er i gang." },
          { title: "Gennemført", statuses: ["completed"], description: "Assessment er gennemført og klar til visning." },
          { title: "Lukket", statuses: ["expired", "closed"], description: "Invitationen er udløbet eller lukket." },
        ];

        const summary = {
          total: rows.length,
          active: rows.filter((row) => ["pending", "started"].includes(row.lifecycleStatus)).length,
          completed: rows.filter((row) => row.lifecycleStatus === "completed").length,
          claimed: rows.filter((row) => Boolean(row.claimedAt)).length,
        };

        const latestInvite = rows[0] ?? null;
        const showFirstInviteSuccess = createState.status === "success" && lastCreatedCompanyId === company.id && summary.total === 1 && latestInvite;

        return (
          <section key={company.id} className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{company.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Invitationer og kandidater i denne virksomhed.</p>
              </div>
            </div>

            <form id={`create-invite-${company.id}`} action={createAction} className="mt-5 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="companyId" value={company.id} />
              <Input name="candidateName" placeholder="Kandidatnavn" />
              <Input name="candidateEmail" type="email" placeholder="Kandidat-email" />
              <Input name="expiresInDays" type="number" min={1} max={30} defaultValue={7} />
              <div className="md:col-span-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="sendInviteEmail" className="h-4 w-4" />
                  Send invitation på email
                </label>
                <Button type="submit" onClick={() => setLastCreatedCompanyId(company.id)}>
                  Opret invitation
                </Button>
              </div>
            </form>

            {showFirstInviteSuccess && latestInvite ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-900">Første invitation er klar.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="max-w-full overflow-x-auto rounded-md bg-background px-2 py-1 text-xs text-foreground">{`${origin}/disc/invite/${latestInvite.token}`}</code>
                  <CopyLinkButton link={`${origin}/disc/invite/${latestInvite.token}`} />
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Invitationer</p>
                <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Aktive</p>
                <p className="mt-1 text-2xl font-semibold">{summary.active}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Claimet</p>
                <p className="mt-1 text-2xl font-semibold">{summary.claimed}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Gennemført</p>
                <p className="mt-1 text-2xl font-semibold">{summary.completed}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-background/40 p-6 text-center">
                  <p className="text-base font-medium">Ingen invitationer endnu</p>
                </div>
              ) : (
                statusBuckets.map((bucket) => {
                  const bucketRows = rows.filter((row) => bucket.statuses.includes(row.lifecycleStatus));
                  if (bucketRows.length === 0) {
                    return null;
                  }

                  return (
                    <div key={bucket.title} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{bucket.title}</h3>
                          <p className="text-xs text-muted-foreground">{bucket.description}</p>
                        </div>
                        <p className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{bucketRows.length}</p>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border/70">
                        <table className="min-w-full divide-y divide-border/70 text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Kandidat</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium">Oprettet</th>
                              <th className="px-3 py-2 font-medium">Claimet</th>
                              <th className="px-3 py-2 font-medium">Gennemført</th>
                              <th className="px-3 py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {bucketRows.map((row) => {
                              const inviteLink = `${origin}/disc/invite/${row.token}`;
                              const resultLink = row.latestAssessment?.resultShare ? `${origin}/disc/result/${row.latestAssessment.resultShare.token}` : null;

                              return (
                                <tr key={row.id}>
                                  <td className="px-3 py-3">
                                    <p className="font-medium">{row.candidateName ?? "Unavngiven kandidat"}</p>
                                    <p className="text-xs text-muted-foreground">{row.candidateEmail ?? "Ingen email"}</p>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusTone(row.lifecycleStatus))}>
                                      {toInviteStatusLabel(row.lifecycleStatus)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                                  <td className="px-3 py-3 text-muted-foreground">{formatDate(row.claimedAt)}</td>
                                  <td className="px-3 py-3 text-muted-foreground">{formatDate(row.completedAt)}</td>
                                  <td className="px-3 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      <CopyLinkButton link={inviteLink} />
                                      <a
                                        href={row.latestAssessment ? `/disc/company/candidates/${row.latestAssessment.id}` : inviteLink}
                                        className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
                                      >
                                        {row.latestAssessment ? "Åbn kandidat" : "Åbn invitation"}
                                      </a>
                                      {resultLink ? (
                                        <a
                                          href={resultLink}
                                          className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Åbn resultat
                                        </a>
                                      ) : null}

                                      {row.lifecycleStatus === "pending" || row.lifecycleStatus === "started" ? (
                                        <form action={resendInviteAction}>
                                          <input type="hidden" name="companyId" value={company.id} />
                                          <input type="hidden" name="inviteId" value={row.id} />
                                          <Button type="submit" variant="outline" className="h-8 text-xs" disabled={!row.candidateEmail}>
                                            Gensend invite
                                          </Button>
                                        </form>
                                      ) : null}

                                      {row.lifecycleStatus === "completed" && row.latestAssessment ? (
                                        <form action={resendAction}>
                                          <input type="hidden" name="companyId" value={company.id} />
                                          <input type="hidden" name="assessmentId" value={row.latestAssessment.id} />
                                          <Button type="submit" variant="outline" className="h-8 text-xs">
                                            Gensend resultat
                                          </Button>
                                        </form>
                                      ) : null}

                                      {row.lifecycleStatus === "pending" || row.lifecycleStatus === "started" ? (
                                        <form action={invalidateAction}>
                                          <input type="hidden" name="inviteId" value={row.id} />
                                          <input type="hidden" name="companyId" value={company.id} />
                                          <Button type="submit" variant="outline" className="h-8 text-xs">
                                            Luk invitation
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
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
