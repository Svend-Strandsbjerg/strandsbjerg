"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialSignupActionState, registerUser } from "@/app/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [state, action, pending] = useActionState(registerUser, initialSignupActionState);

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign up with your email. New accounts need manual approval before family access is available.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <Input name="name" placeholder="Name (optional)" />
        <Input type="email" name="email" required placeholder="you@example.com" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Go to login
        </Link>
      </p>
    </div>
  );
}
