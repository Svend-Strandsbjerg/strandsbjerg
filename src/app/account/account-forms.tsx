"use client";

import { useActionState } from "react";

import { changeMyPassword, updateMyProfile } from "@/app/account/actions";
import { initialAccountActionState } from "@/app/account/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function StateMessage({ message, status }: { message: string; status: "idle" | "success" | "error" }) {
  if (status === "idle") {
    return null;
  }

  return <p className={status === "success" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{message}</p>;
}

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(updateMyProfile, initialAccountActionState);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input name="name" defaultValue={defaultName} placeholder="Your name" maxLength={120} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <StateMessage message={state.message} status={state.status} />
        <Button type="submit">Save profile</Button>
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changeMyPassword, initialAccountActionState);

  return (
    <form action={action} className="space-y-3">
      {hasPassword ? (
        <div className="space-y-1">
          <label className="text-sm font-medium">Current password</label>
          <Input type="password" name="currentPassword" autoComplete="current-password" required />
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-sm font-medium">New password</label>
        <Input type="password" name="newPassword" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Confirm new password</label>
        <Input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="flex items-center justify-between gap-3">
        <StateMessage message={state.message} status={state.status} />
        <Button type="submit" variant="outline">
          Change password
        </Button>
      </div>
    </form>
  );
}
