import Link from "next/link";

type AdminAccessDeniedProps = {
  title: string;
  message: string;
};

export function AdminAccessDenied({ title, message }: AdminAccessDeniedProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-md border px-3 py-2 text-sm">
            Tilbage til admincockpit
          </Link>
          <Link href="/account" className="rounded-md border px-3 py-2 text-sm">
            Gå til min bruger
          </Link>
        </div>
      </section>
    </div>
  );
}
