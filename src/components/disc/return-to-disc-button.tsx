"use client";

import { Button } from "@/components/ui/button";

export function ReturnToDiscButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9"
      onClick={() => {
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = "/disc";
          window.opener.focus();
        }
        window.close();
      }}
    >
      Close this window
    </Button>
  );
}
