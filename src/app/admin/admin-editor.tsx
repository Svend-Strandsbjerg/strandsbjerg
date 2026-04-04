"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialAdminActionState,
  saveHomeContent,
  saveProfessionalContent,
  type AdminActionState,
} from "@/app/admin/actions";
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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin content editor</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Edit homepage and professional page content. Changes are saved directly to the database.
        </p>
        {isDirty ? <p className="text-sm text-amber-600">You have unsaved changes.</p> : null}
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Home page</h2>
          <p className="text-sm text-muted-foreground">Update the hero copy and core strengths shown on the public homepage.</p>
        </div>

        <form action={homeAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Headline</label>
            <Input name="headline" defaultValue={homeContent.headline} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Intro paragraph</label>
            <Textarea name="intro" defaultValue={homeContent.intro} required rows={5} className="leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Core strengths (one per line)</label>
            <Textarea name="sections" defaultValue={homeContent.sections.join("\n")} required rows={9} className="leading-relaxed" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <StatusMessage state={homeState} />
            <SubmitButton label="Save home content" />
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Professional page</h2>
          <p className="text-sm text-muted-foreground">Maintain profile text, highlights, and focus areas.</p>
        </div>

        <form action={professionalAction} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero title</label>
            <Input name="heroTitle" defaultValue={professionalContent.heroTitle} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero intro</label>
            <Textarea name="heroIntro" defaultValue={professionalContent.heroIntro} required rows={5} className="leading-relaxed" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Competencies (one per line)</label>
              <Textarea
                name="competencies"
                defaultValue={professionalContent.competencies.join("\n")}
                required
                rows={8}
                className="leading-relaxed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience highlights (one per line)</label>
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Focus areas</h3>
            {professionalContent.focusAreas.map((area, index) => (
              <div key={`${area.title}-${index}`} className="rounded-2xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input name="focusTitle" defaultValue={area.title} required />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Description</label>
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
    </div>
  );
}
