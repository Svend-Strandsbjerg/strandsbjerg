import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { canAccessAdminCockpit, canAccessFamily, canAccessInvestments } from "@/lib/access";
import { auth, signIn } from "@/lib/auth";
import { FAMILY_PRIVATE_BASE_PATH, INVESTMENTS_PRIVATE_BASE_PATH } from "@/lib/private-routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const loginErrors: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  pending_approval: "Your account is pending approval.",
  rejected_account: "Your account request was rejected.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);
  const user = session?.user;
  const status = user?.approvalStatus;
  const restrictedAccess = params?.state === "restricted";
  const hasGoogleOAuthCredentials = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasResendCredentials = Boolean(process.env.AUTH_RESEND_KEY);
  const authErrorKey = !isAuthenticated ? (Array.isArray(params?.error) ? params?.error[0] : params?.error) : undefined;

  if (isAuthenticated && status === "APPROVED") {
    if (canAccessAdminCockpit(user)) {
      redirect("/admin");
    }

    if (canAccessFamily(user)) {
      redirect(FAMILY_PRIVATE_BASE_PATH);
    }

    redirect("/account");
  }

  const credentialsSignIn = async (formData: FormData) => {
    "use server";

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      redirect("/login?error=invalid_credentials");
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/login",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.type === "CredentialsSignin") {
          redirect("/login?error=invalid_credentials");
        }
      }

      throw error;
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Login required</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Access to private areas is limited to authenticated users.
      </p>
      {authErrorKey && loginErrors[authErrorKey] ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{loginErrors[authErrorKey]}</p>
      ) : null}
      {isAuthenticated ? (
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-left text-sm">
          {status === "REJECTED" ? (
            <p className="text-destructive">Your account request was rejected. You do not have access to family features.</p>
          ) : status === "PENDING" ? (
            <p className="text-amber-700">Your account is awaiting approval. Family and investment features are restricted until approved.</p>
          ) : (
            <p className="text-foreground">You are signed in.</p>
          )}
          {restrictedAccess ? <p className="mt-2 text-muted-foreground">You tried to open a restricted route.</p> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/account" className="inline-block underline-offset-4 hover:underline">
              Open account
            </Link>
            {canAccessFamily(user) ? (
              <Link href={FAMILY_PRIVATE_BASE_PATH} className="inline-block underline-offset-4 hover:underline">
                Open family area
              </Link>
            ) : null}
            {canAccessInvestments(user) ? (
              <Link href={INVESTMENTS_PRIVATE_BASE_PATH} className="inline-block underline-offset-4 hover:underline">
                Open investments
              </Link>
            ) : null}
            {canAccessAdminCockpit(user) ? (
              <Link href="/admin" className="inline-block underline-offset-4 hover:underline">
                Open admin
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <div className="space-y-3">
          <form action={credentialsSignIn} className="space-y-2">
            <Input type="email" name="email" required placeholder="you@example.com" autoComplete="email" />
            <Input type="password" name="password" required placeholder="Password" autoComplete="current-password" />
            <Button className="w-full">Sign in with email</Button>
          </form>

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
            <p className="text-xs text-muted-foreground">Google sign-in is not configured on this deployment.</p>
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
            <p className="text-xs text-muted-foreground">Magic link sign-in is not configured on this deployment.</p>
          )}
        </div>
      ) : null}

      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          Need an account?{" "}
          <Link href="/signup" className="underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}
