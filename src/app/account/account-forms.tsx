"use client";

import { useActionState } from "react";

import { updateMyProfile } from "@/app/account/actions";
import { initialAccountActionState } from "@/app/account/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function StateMessage({ message, status }: { message: string; status: "idle" | "success" | "error" }) {
  if (status === "idle") {
    return null;
  }

  return <p className={status === "success" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{message}</p>;
}

export function ProfileForm({ defaultName, email }: { defaultName: string; email: string }) {
  const [state, action] = useActionState(updateMyProfile, initialAccountActionState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Navn</label>
        <Input name="name" defaultValue={defaultName} placeholder="Dit navn" maxLength={120} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">E-mail</label>
        <Input value={email} readOnly disabled className="opacity-80" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <StateMessage message={state.message} status={state.status} />
        <Button type="submit">Gem ændringer</Button>
      </div>
    </form>
  );
}
