"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveHomeContent, saveProfessionalContent } from "@/app/admin/actions";
import { initialAdminActionState, type AdminActionState } from "@/app/admin/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { HomePageContent, ProfessionalPageContent } from "@/lib/content";

type AdminEditorProps = {
  homeContent: HomePageContent;
  professionalContent: ProfessionalPageContent;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : label}</Button>;
}

function StatusMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle") {
    return null;
  }

  return <p className={state.status === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{state.message}</p>;
}

export function AdminEditor({ homeContent, professionalContent }: AdminEditorProps) {
  const [homeState, homeAction] = useActionState(saveHomeContent, initialAdminActionState);
  const [professionalState, professionalAction] = useActionState(saveProfessionalContent, initialAdminActionState);

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
    if (homeState.status === "success" || professionalState.status === "success") {
      setIsDirty(false);
    }
  }, [homeState.status, professionalState.status]);

  const onInput = () => {
    setIsDirty(true);
  };

  return (
    <div ref={formRef} onInput={onInput} className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Siteadministration</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Redigér offentligt website-indhold pr. sektion. Gem ændringer når en sektion er klar.
        </p>
        {isDirty ? <p className="text-sm text-amber-600">Du har ikke-gemte ændringer.</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="#home-content" className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground">
            Forside
          </a>
          <a href="#professional-content" className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground">
            Professionel side
          </a>
        </div>
      </header>

      <section id="home-content" className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Forside</h2>
            <Link href="/" target="_blank" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Forhåndsvis side ↗
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Redigér sektionerne som vises på den offentlige forside.</p>
        </div>

        <form action={homeAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sektion: Hero-overskrift</label>
            <Input name="headline" defaultValue={homeContent.headline} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sektion: Hero-introtekst</label>
            <Textarea name="intro" defaultValue={homeContent.intro} required rows={5} className="leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sektion: Kernepunkter (én pr. linje)</label>
            <Textarea name="sections" defaultValue={homeContent.sections.join("\n")} required rows={9} className="leading-relaxed" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <StatusMessage state={homeState} />
            <SubmitButton label="Gem forsideindhold" />
          </div>
        </form>
      </section>

      <section id="professional-content" className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Professionel side</h2>
            <Link href="/professional" target="_blank" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Forhåndsvis side ↗
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Redigér teksterne som vises på siden “Professionel”.</p>
        </div>

        <form action={professionalAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sektion: Hero-titel</label>
            <Input name="heroTitle" defaultValue={professionalContent.heroTitle} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sektion: Hero-introtekst</label>
            <Textarea name="heroIntro" defaultValue={professionalContent.heroIntro} required rows={5} className="leading-relaxed" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sektion: Kompetencer (én pr. linje)</label>
              <Textarea name="competencies" defaultValue={professionalContent.competencies.join("\n")} required rows={8} className="leading-relaxed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sektion: Erfaringspunkter (én pr. linje)</label>
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sektionsgruppe: Fokusområder</h3>
            {professionalContent.focusAreas.map((area, index) => (
              <div key={`${area.title}-${index}`} className="rounded-2xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fokusområde titel</label>
                  <Input name="focusTitle" defaultValue={area.title} required />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Fokusområde beskrivelse</label>
                  <Textarea name="focusBody" defaultValue={area.body} required rows={4} className="leading-relaxed" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <StatusMessage state={professionalState} />
            <SubmitButton label="Gem indhold for professionel side" />
          </div>
        </form>
      </section>
    </div>
  );
}
