import Link from "next/link";

import { FAMILY_PRIVATE_BASE_PATH } from "@/lib/private-routes";

export default function EventNotFound() {
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Event blev ikke fundet</h1>
      <p className="mt-3 text-sm text-muted-foreground">Eventet findes ikke, eller du har ikke adgang til det.</p>
      <Link href={FAMILY_PRIVATE_BASE_PATH} className="mt-5 inline-block text-sm text-primary">
        Tilbage til Familie
      </Link>
    </div>
  );
}
