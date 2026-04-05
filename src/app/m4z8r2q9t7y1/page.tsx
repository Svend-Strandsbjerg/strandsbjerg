import { SecurityType } from "@prisma/client";

import { SecurityCreateForm, TransactionCreateForm } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";
import { SECURITY_TYPE_LABELS, formatAmount } from "@/lib/investments";

export const dynamic = "force-dynamic";

export default async function InvestmentsOverviewPage() {
  const { securities, holdings, totalInvested, typeBreakdown } = await getPortfolioData();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Portfolio overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total invested</p>
            <p className="mt-2 text-2xl font-semibold">{formatAmount(totalInvested)} (base)</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Securities</p>
            <p className="mt-2 text-2xl font-semibold">{securities.length}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active holdings</p>
            <p className="mt-2 text-2xl font-semibold">{holdings.length}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Categories used</p>
            <p className="mt-2 text-2xl font-semibold">
              {Object.values(SecurityType).filter((type) => typeBreakdown[type].securityCount > 0).length}
            </p>
          </article>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Securities</th>
                <th className="py-2 pr-3 font-medium">Holdings</th>
                <th className="py-2 font-medium">Invested amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(SecurityType).map((type) => (
                <tr key={type} className="border-b border-border/70">
                  <td className="py-2 pr-3">{SECURITY_TYPE_LABELS[type]}</td>
                  <td className="py-2 pr-3">{typeBreakdown[type].securityCount}</td>
                  <td className="py-2 pr-3">{typeBreakdown[type].holdingCount}</td>
                  <td className="py-2">{formatAmount(typeBreakdown[type].investedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecurityCreateForm />
        <TransactionCreateForm securities={securities} />
      </div>
    </div>
  );
}
