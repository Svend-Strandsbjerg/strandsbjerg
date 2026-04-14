"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ReturnToDiscButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9"
      onClick={() => {
        router.push("/disc");
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = "/disc";
          window.opener.focus();
        }
        window.close();
      }}
    >
      Luk
    </Button>
  );
}
