import { ManualPriceForm, PurchaseCreateForm } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";
import { formatAmount } from "@/lib/investments";

export const dynamic = "force-dynamic";

export default async function InvestmentsOverviewPage() {
  const { securities, holdings, totalInvested, marketDataProvider } = await getPortfolioData();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Investeringer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total investeret</p>
            <p className="mt-2 text-2xl font-semibold">{formatAmount(totalInvested)}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Papirer</p>
            <p className="mt-2 text-2xl font-semibold">{securities.length}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktive positioner</p>
            <p className="mt-2 text-2xl font-semibold">{holdings.length}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Kurskilde</p>
            <p className="mt-2 text-lg font-semibold">{marketDataProvider}</p>
          </article>
        </div>

        {marketDataProvider === "UNCONFIGURED" ? (
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            Live markedsdata er ikke konfigureret endnu. Brug feltet “Manuel kurs” for at holde porteføljen opdateret.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <PurchaseCreateForm />
        <ManualPriceForm securities={securities} />
      </div>
    </div>
  );
}
