import { createInvestmentEntry } from "@/app/m4z8r2q9t7y1/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function InvestmentsPage() {
  await requireUser();

  const entries = await prisma.investmentEntry.findMany({
    orderBy: { investedOn: "desc" },
  });

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Investments</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Private overview of investment entries.
        </p>
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Add entry</h2>
        <form action={createInvestmentEntry} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input name="name" placeholder="Name" required />
          <Input name="type" placeholder="Type" required />
          <Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required />
          <Input name="investedOn" type="date" required />
          <div className="sm:col-span-2">
            <Button type="submit">Save entry</Button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/70">
                  <td className="py-2 pr-3">{entry.name}</td>
                  <td className="py-2 pr-3">{entry.type}</td>
                  <td className="py-2 pr-3">{entry.amount.toFixed(2)}</td>
                  <td className="py-2">{entry.investedOn.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={4}>
                    No entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
