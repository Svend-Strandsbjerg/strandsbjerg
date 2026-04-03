import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center">
      <h1 className="text-2xl font-semibold">Login required</h1>
      <p className="text-sm text-muted-foreground">Access to the family planning area is limited to authenticated users.</p>

      <div className="space-y-3">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/familie" });
          }}
        >
          <button className="w-full rounded-full border border-border px-4 py-2 text-sm">Continue with Google</button>
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
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm"
          />
          <button className="w-full rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Send magic link</button>
        </form>
      </div>
    </div>
  );
}
