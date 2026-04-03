import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-semibold tracking-tight">Contact</h1>
      <p className="text-muted-foreground">
        For consulting opportunities, architecture discussions, or technical collaboration, feel free to reach out.
      </p>

      <div className="rounded-2xl border border-border bg-card p-8">
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="name" name="name" placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium">
              Message
            </label>
            <Textarea id="message" name="message" placeholder="How can I help?" />
          </div>
          <Button type="button">Send message</Button>
        </form>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Email: your.email@example.com</p>
        <p>LinkedIn: linkedin.com/in/your-linkedin</p>
      </div>
    </div>
  );
}
