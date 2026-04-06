"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveHomeContent, saveProfessionalContent, setUserPassword, updateUserAccess } from "@/app/admin/actions";
import { initialAdminActionState, type AdminActionState } from "@/app/admin/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { HomePageContent, ProfessionalPageContent } from "@/lib/content";
import { formatAuthMethodLabel } from "@/lib/login-activity";

type AdminEditorProps = {
  homeContent: HomePageContent;
  professionalContent: ProfessionalPageContent;
  users: Array<{
    id: string;
    email: string | null;
    role: "ADMIN" | "FAMILY" | "USER";
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: Date;
    loginActivities: Array<{
      id: string;
      timestamp: Date;
      authMethod: "CREDENTIALS" | "GOOGLE" | "MAGIC_LINK" | "OAUTH";
    }>;
    _count: {
      loginActivities: number;
    };
  }>;
  currentAdminUserId?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

function StatusMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <p className={state.status === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{state.message}</p>
  );
}

export function AdminEditor({ homeContent, professionalContent, users, currentAdminUserId }: AdminEditorProps) {
  const [homeState, homeAction] = useActionState(saveHomeContent, initialAdminActionState);
  const [professionalState, professionalAction] = useActionState(saveProfessionalContent, initialAdminActionState);
  const [userUpdateState, userUpdateAction] = useActionState(updateUserAccess, initialAdminActionState);
  const [passwordState, passwordAction] = useActionState(setUserPassword, initialAdminActionState);

  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (
      homeState.status === "success" ||
      professionalState.status === "success" ||
      userUpdateState.status === "success" ||
      passwordState.status === "success"
    ) {
      setIsDirty(false);
    }
  }, [homeState.status, professionalState.status, userUpdateState.status, passwordState.status]);

  const onInput = () => {
    setIsDirty(true);
  };

  const userManagementState = passwordState.status !== "idle" ? passwordState : userUpdateState;

  return (
    <div ref={formRef} onInput={onInput} className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Website content editor</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Update public website copy by section. Save changes when a section is ready.
        </p>
        {isDirty ? <p className="text-sm text-amber-600">You have unsaved changes.</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="#home-content" className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground">
            Home sections
          </a>
          <a
            href="#professional-content"
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Professional sections
          </a>
          <a
            href="#user-management"
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            User management
          </a>
        </div>
      </header>

      <section id="home-content" className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Home page</h2>
            <Link href="/" target="_blank" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Preview page ↗
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Edit each section shown on the public Home page.</p>
        </div>

        <form action={homeAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Section: Hero headline</label>
            <Input name="headline" defaultValue={homeContent.headline} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Section: Hero intro paragraph</label>
            <Textarea name="intro" defaultValue={homeContent.intro} required rows={5} className="leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Section: Core strengths list (one per line)</label>
            <Textarea name="sections" defaultValue={homeContent.sections.join("\n")} required rows={9} className="leading-relaxed" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <StatusMessage state={homeState} />
            <SubmitButton label="Save home content" />
          </div>
        </form>
      </section>

      <section id="professional-content" className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Professional page</h2>
            <Link href="/professional" target="_blank" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Preview page ↗
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Edit each text section shown on the Professional page.</p>
        </div>

        <form action={professionalAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Section: Hero title</label>
            <Input name="heroTitle" defaultValue={professionalContent.heroTitle} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Section: Hero intro paragraph</label>
            <Textarea name="heroIntro" defaultValue={professionalContent.heroIntro} required rows={5} className="leading-relaxed" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section: Competencies (one per line)</label>
              <Textarea
                name="competencies"
                defaultValue={professionalContent.competencies.join("\n")}
                required
                rows={8}
                className="leading-relaxed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Section: Experience highlights (one per line)</label>
              <Textarea
                name="experienceHighlights"
                defaultValue={professionalContent.experienceHighlights.join("\n")}
                required
                rows={8}
                className="leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Section group: Focus areas</h3>
            {professionalContent.focusAreas.map((area, index) => (
              <div key={`${area.title}-${index}`} className="rounded-2xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Focus area title</label>
                  <Input name="focusTitle" defaultValue={area.title} required />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Focus area description</label>
                  <Textarea name="focusBody" defaultValue={area.body} required rows={4} className="leading-relaxed" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <StatusMessage state={professionalState} />
            <SubmitButton label="Save professional content" />
          </div>
        </form>
      </section>

      <section id="user-management" className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">User management</h2>
          <p className="text-sm text-muted-foreground">Approve or reject users and assign their role.</p>
        </div>

        <div className="mt-4">
          <StatusMessage state={userManagementState} />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Approval status</th>
                <th className="py-2 pr-3 font-medium">Created at</th>
                <th className="py-2 pr-3 font-medium">Login activity</th>
                <th className="py-2 pr-3 font-medium">Access check</th>
                <th className="py-2 font-medium">Admin actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-3">{user.email ?? "No email"}</td>
                  <td className="py-3 pr-3">{user.role.toLowerCase()}</td>
                  <td className="py-3 pr-3">{user.approvalStatus.toLowerCase()}</td>
                  <td className="py-3 pr-3">{user.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    <p>{user._count.loginActivities} total logins</p>
                    <p className="mt-1">
                      Latest: {user.loginActivities[0] ? user.loginActivities[0].timestamp.toLocaleString() : "Never"}
                    </p>
                    {user.loginActivities.length > 0 ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Recent events</summary>
                        <ul className="mt-1 space-y-1">
                          {user.loginActivities.map((entry) => (
                            <li key={entry.id}>
                              {formatAuthMethodLabel(entry.authMethod)} · {entry.timestamp.toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    <p>Family: {user.approvalStatus === "APPROVED" && ["FAMILY", "ADMIN"].includes(user.role) ? "yes" : "no"}</p>
                    <p className="mt-1">Investments: {user.approvalStatus === "APPROVED" && user.role === "ADMIN" ? "yes" : "no"}</p>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={userUpdateAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="role" defaultValue={user.role} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                          <option value="USER">user</option>
                          <option value="FAMILY">family</option>
                          <option value="ADMIN">admin</option>
                        </select>
                        <select
                          name="approvalStatus"
                          defaultValue={user.approvalStatus}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="PENDING">pending</option>
                          <option value="APPROVED">approved</option>
                          <option value="REJECTED">rejected</option>
                        </select>
                        <Button type="submit" disabled={user.id === currentAdminUserId}>
                          Update
                        </Button>
                      </form>
                      <details className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Set new password</summary>
                        <form action={passwordAction} className="mt-2 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <Input
                            type="password"
                            name="newPassword"
                            required
                            minLength={8}
                            placeholder="New password"
                            autoComplete="new-password"
                            className="h-9 w-40"
                          />
                          <Input
                            type="password"
                            name="confirmPassword"
                            required
                            minLength={8}
                            placeholder="Confirm password"
                            autoComplete="new-password"
                            className="h-9 w-40"
                          />
                          <Button type="submit" variant="outline">
                            Save password
                          </Button>
                        </form>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
