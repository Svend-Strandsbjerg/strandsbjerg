import { signIn } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border/80 bg-card p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Login required</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Access to the family planning area is limited to authenticated users.
      </p>

      <div className="space-y-3">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/familie" });
          }}
        >
          <Button className="w-full" variant="outline">
            Continue with Google
          </Button>
        </form>

        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email");
            if (typeof email === "string" && email.includes("@")) {
              await signIn("resend", { email, redirectTo: "/familie" });
            }
          }}
          className="space-y-2"
        >
          <Input type="email" name="email" required placeholder="you@example.com" />
          <Button className="w-full">Send magic link</Button>
        </form>
      </div>
    </div>
  );
}
