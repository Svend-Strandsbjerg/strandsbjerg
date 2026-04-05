import { TransactionCreateForm, TransactionsTable } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { transactions, securities } = await getPortfolioData();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
        <p className="mt-1 text-sm text-muted-foreground">All recorded investment transactions across categories.</p>
        <div className="mt-4">
          <TransactionsTable transactions={transactions} />
        </div>
      </section>
      <TransactionCreateForm securities={securities} />
    </div>
  );
}
