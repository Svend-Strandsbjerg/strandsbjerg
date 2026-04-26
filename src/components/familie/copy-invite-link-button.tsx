"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyInviteLinkButton({ inviteLink }: { inviteLink: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(inviteLink);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        Kopiér invitationslink
      </Button>
      <span className="text-xs text-muted-foreground">{copied ? "Kopieret" : inviteLink}</span>
    </div>
  );
}
