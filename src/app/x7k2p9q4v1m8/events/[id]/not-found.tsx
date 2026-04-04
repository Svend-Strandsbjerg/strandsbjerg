import Link from "next/link";

import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";

export default function EventNotFound() {
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Event not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">The event you requested does not exist or is no longer available.</p>
      <Link href={FAMILY_PRIVATE_BASE_PATH} className="mt-5 inline-block text-sm text-primary">
        Back to private overview
      </Link>
    </div>
  );
}
