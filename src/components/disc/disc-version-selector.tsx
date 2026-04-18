"use client";

import type { DiscVersionEntitlement } from "@/lib/disc-types";
import { cn } from "@/lib/utils";

type DiscVersionSelectorProps = {
  entitlements: DiscVersionEntitlement[];
  selectedVersionId: string;
  onSelect: (assessmentVersionId: string) => void;
  disabled?: boolean;
};

function buildVersionDescription(version: DiscVersionEntitlement["version"]) {
  return version.description ?? version.intendedUse ?? "Assessment details are provided by the DISC engine.";
}

function lockReasonCopy(reason: DiscVersionEntitlement["reason"]) {
  if (reason === "upgrade_required") {
    return "Ikke inkluderet i dit nuværende personlige adgangsniveau.";
  }

  if (reason === "context_restricted") {
    return "Ikke inkluderet i denne invitation eller virksomhedsadgang.";
  }

  if (reason === "not_configured") {
    return "Versionen er fundet, men er ikke klargjort til adgang endnu.";
  }

  return "Denne DISC-version er ikke tilgængelig endnu.";
}

export function DiscVersionSelector({ entitlements, selectedVersionId, onSelect, disabled = false }: DiscVersionSelectorProps) {
  return (
    <div className="space-y-3">
      {entitlements.map((entitlement) => {
        const version = entitlement.version;
        const selected = selectedVersionId === version.id;
        const isSelectable = entitlement.status === "selectable";
        const isLocked = entitlement.status === "locked";
        return (
          <button
            key={version.id}
            type="button"
            onClick={() => {
              if (isSelectable) {
                onSelect(version.id);
              }
            }}
            disabled={disabled || !isSelectable}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selected ? "border-foreground/70 bg-foreground/[0.04] shadow-sm" : "border-border/80 bg-card",
              isSelectable ? "hover:border-foreground/40" : "cursor-not-allowed opacity-80",
              disabled ? "opacity-70" : "",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{version.displayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{buildVersionDescription(version)}</p>
              </div>
              {selected ? <span className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Valgt</span> : null}
              {isLocked ? <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Låst</span> : null}
            </div>
            {isLocked ? <p className="mt-2 text-xs text-muted-foreground">{lockReasonCopy(entitlement.reason)}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {version.expectedQuestionCount !== null ? (
                <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {version.expectedQuestionCount} spørgsmål
                </span>
              ) : null}
              {version.estimatedDurationMinutes !== null ? (
                <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                  Ca. {version.estimatedDurationMinutes} min
                </span>
              ) : null}
              {version.intendedUse ? (
                <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {version.intendedUse}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
