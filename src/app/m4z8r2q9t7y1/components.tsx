import { type InvestmentTransaction, type Security } from "@prisma/client";

import { createInvestmentPurchase, saveManualPrice } from "@/app/m4z8r2q9t7y1/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount, formatQuantity, type HoldingPosition } from "@/lib/investments";

export function PurchaseCreateForm() {
  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Tilføj køb</h2>
      <form action={createInvestmentPurchase} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input name="isin" placeholder="ISIN" required />
        <Input name="securityName" placeholder="Navn (hvis kendt)" />
        <Input name="quantity" type="number" min="0.000001" step="0.000001" placeholder="Antal" required />
        <Input name="purchasePrice" type="number" min="0.0001" step="0.0001" placeholder="Købspris" required />
        <Input name="purchaseDate" type="date" required placeholder="Købsdato" />
        <Input name="currency" placeholder="Valuta" required defaultValue="DKK" />
        <div className="sm:col-span-2 lg:col-span-3">
          <Input name="notes" placeholder="Noter (valgfrit)" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit">Gem køb</Button>
        </div>
      </form>
    </section>
  );
}

export function ManualPriceForm({ securities }: { securities: Security[] }) {
  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Manuel kurs</h2>
      {securities.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Tilføj først et køb for at kunne gemme manuel kurs.</p>
      ) : (
        <form action={saveManualPrice} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select name="securityId" className="h-11 rounded-md border border-border bg-background px-3 text-sm" required>
            {securities.map((security) => (
              <option key={security.id} value={security.id}>{`${security.isin ?? "-"} · ${security.name}`}</option>
            ))}
          </select>
          <Input name="manualPrice" type="number" min="0.0001" step="0.0001" placeholder="Manuel kurs" required />
          <Input name="currency" placeholder="Valuta" required defaultValue="DKK" />
          <Input name="pricedAt" type="date" required />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input name="notes" placeholder="Noter (valgfrit)" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit">Gem manuel kurs</Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function HoldingsTable({ holdings }: { holdings: HoldingPosition[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">ISIN</th>
            <th className="py-2 pr-3 font-medium">Navn</th>
            <th className="py-2 pr-3 font-medium">Antal</th>
            <th className="py-2 pr-3 font-medium">Gns. købspris</th>
            <th className="py-2 pr-3 font-medium">Investeret beløb</th>
            <th className="py-2 pr-3 font-medium">Seneste kurs</th>
            <th className="py-2 pr-3 font-medium">Markedsværdi</th>
            <th className="py-2 pr-3 font-medium">Afkast</th>
            <th className="py-2 font-medium">Afkast %</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.securityId} className="border-b border-border/70">
              <td className="py-2 pr-3 font-medium">{holding.isin}</td>
              <td className="py-2 pr-3">{holding.name}</td>
              <td className="py-2 pr-3">{formatQuantity(holding.totalQuantity)}</td>
              <td className="py-2 pr-3">{formatAmount(holding.averagePurchasePrice)} {holding.currency}</td>
              <td className="py-2 pr-3">{formatAmount(holding.investedAmount)} {holding.currency}</td>
              <td className="py-2 pr-3">
                {holding.latestMarketPrice === null
                  ? "Ikke tilgængelig"
                  : `${formatAmount(holding.latestMarketPrice)} ${holding.currency} (${holding.latestMarketPriceSource})`}
              </td>
              <td className="py-2 pr-3">
                {holding.latestMarketValue === null ? "-" : `${formatAmount(holding.latestMarketValue)} ${holding.currency}`}
              </td>
              <td className="py-2 pr-3">
                {holding.gainLossAmount === null ? "-" : `${formatAmount(holding.gainLossAmount)} ${holding.currency}`}
              </td>
              <td className="py-2">{holding.gainLossPercent === null ? "-" : `${formatAmount(holding.gainLossPercent)}%`}</td>
            </tr>
          ))}
          {holdings.length === 0 ? (
            <tr>
              <td className="py-3 text-muted-foreground" colSpan={9}>
                Ingen beholdninger endnu.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionsTable({ transactions }: { transactions: Array<InvestmentTransaction & { security: Security }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Købsdato</th>
            <th className="py-2 pr-3 font-medium">ISIN</th>
            <th className="py-2 pr-3 font-medium">Navn</th>
            <th className="py-2 pr-3 font-medium">Antal</th>
            <th className="py-2 pr-3 font-medium">Købspris</th>
            <th className="py-2 font-medium">Noter</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-border/70">
              <td className="py-2 pr-3">{transaction.transactedOn.toISOString().slice(0, 10)}</td>
              <td className="py-2 pr-3">{transaction.security.isin ?? "-"}</td>
              <td className="py-2 pr-3">{transaction.security.name}</td>
              <td className="py-2 pr-3">{formatQuantity(transaction.quantity.toNumber())}</td>
              <td className="py-2 pr-3">{formatAmount(transaction.price.toNumber())} {transaction.security.currency}</td>
              <td className="py-2">{transaction.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
