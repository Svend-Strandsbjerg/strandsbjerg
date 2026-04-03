import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 sm:space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Contact</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          For consulting opportunities, architecture discussions, or technical collaboration, feel free to reach out.
        </p>
      </header>

      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <form className="space-y-5" aria-label="Contact form">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <Input id="name" name="name" placeholder="Your name" autoComplete="name" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="block text-sm font-medium">
              Message
            </label>
            <Textarea id="message" name="message" placeholder="Tell me briefly about your project or challenge." />
          </div>

          <Button type="button">Send message</Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <p>Email: your.email@example.com</p>
        <p className="mt-1">LinkedIn: linkedin.com/in/your-linkedin</p>
      </div>
    </div>
  );
}
