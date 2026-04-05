import { signIn } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { isApprovedFamilyUser } from "@/lib/access";
import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await auth();
  const status = session?.user?.approvalStatus;
  const restrictedAccess = params?.state === "restricted";
  const hasGoogleOAuthCredentials = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasResendCredentials = Boolean(process.env.AUTH_RESEND_KEY);

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Login required</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Access to private areas is limited to authenticated users.
      </p>
      {session?.user ? (
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-left text-sm">
          {isApprovedFamilyUser(session.user) ? (
            <p className="text-emerald-700">Your account is approved. You can access the family area.</p>
          ) : status === "REJECTED" ? (
            <p className="text-destructive">Your account request was rejected. You do not have access to family features.</p>
          ) : (
            <p className="text-amber-700">Your account is awaiting approval. Family features are restricted until approved.</p>
          )}
          {restrictedAccess ? <p className="mt-2 text-muted-foreground">You tried to open a restricted route.</p> : null}
          {isApprovedFamilyUser(session.user) ? (
            <Link href={FAMILY_PRIVATE_BASE_PATH} className="mt-3 inline-block underline-offset-4 hover:underline">
              Open family area
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {hasGoogleOAuthCredentials ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/login" });
            }}
          >
            <Button className="w-full" variant="outline">
              Continue with Google
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Google sign-in is not configured on this deployment.
          </p>
        )}

        {hasResendCredentials ? (
          <form
            action={async (formData) => {
              "use server";
              const email = formData.get("email");
              if (typeof email === "string" && email.includes("@")) {
                await signIn("resend", { email, redirectTo: "/login" });
              }
            }}
            className="space-y-2"
          >
            <Input type="email" name="email" required placeholder="you@example.com" />
            <Button className="w-full">Send magic link</Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Magic link sign-in is not configured on this deployment.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Need an account?{" "}
        <Link href="/signup" className="underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
