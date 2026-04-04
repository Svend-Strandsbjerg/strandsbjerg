import { signIn } from "@/lib/auth";
import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const hasGoogleOAuthCredentials = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasResendCredentials = Boolean(process.env.AUTH_RESEND_KEY);

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Login required</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Access to private areas is limited to authenticated users.
      </p>

      <div className="space-y-3">
        {hasGoogleOAuthCredentials ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: FAMILY_PRIVATE_BASE_PATH });
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
                await signIn("resend", { email, redirectTo: FAMILY_PRIVATE_BASE_PATH });
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
    </div>
  );
}
