"use client";

import { useActionState } from "react";

import { createCompanyProfile, initialCompanyInviteActionState } from "@/app/disc/company/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CompanyProfileSetup() {
  const [state, action] = useActionState(createCompanyProfile, initialCompanyInviteActionState);

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Opret virksomhedsprofil</h1>
      <p className="text-sm text-muted-foreground">Start virksomhedsflowet ved at oprette en profil. Du bliver automatisk admin og kan oprette invitationer bagefter.</p>
      <form action={action} className="space-y-3">
        <Input name="companyName" required minLength={2} placeholder="Virksomhedsnavn" />
        <Button type="submit">Opret virksomhed</Button>
      </form>
      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
    </div>
  );
}
