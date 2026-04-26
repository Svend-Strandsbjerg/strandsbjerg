import { HoldingsTable } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const { holdings } = await getPortfolioData();

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Beholdninger</h2>
      <p className="mt-1 text-sm text-muted-foreground">Aggregeret portefølje pr. ISIN med afkast baseret på seneste kurs.</p>
      <div className="mt-4">
        <HoldingsTable holdings={holdings} />
      </div>
    </section>
  );
}
