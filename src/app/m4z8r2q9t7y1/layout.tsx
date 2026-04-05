import { InvestmentsSubnav } from "@/app/m4z8r2q9t7y1/investments-subnav";
import { requireUser } from "@/lib/access";

export default async function InvestmentsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();


  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Investment Portfolio</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Private investment workspace for securities, transactions, and holdings. This module is intentionally hidden from public navigation.
        </p>
      </header>
      <InvestmentsSubnav />
      {children}
    </div>
  );
}
