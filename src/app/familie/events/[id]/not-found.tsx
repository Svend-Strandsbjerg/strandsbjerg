import Link from "next/link";

export default function FamilyEventNotFound() {
  return (
    <div className="space-y-4 rounded-xl border border-border p-6">
      <h1 className="text-xl font-semibold">Event not found</h1>
      <p className="text-sm text-muted-foreground">The event may have been removed or the URL is incorrect.</p>
      <Link href="/familie" className="text-sm text-primary">
        Back to familie overview
      </Link>
    </div>
  );
}
