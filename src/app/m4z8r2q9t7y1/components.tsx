import { SecurityType, TransactionType, type InvestmentTransaction, type Security } from "@prisma/client";

import { createSecurity, createTransaction } from "@/app/m4z8r2q9t7y1/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SECURITY_TYPE_LABELS,
  SECURITY_TYPE_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  formatAmount,
  formatQuantity,
  type HoldingPosition,
} from "@/lib/investments";
export function SecurityCreateForm() {
  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Add security</h2>
      <p className="mt-1 text-sm text-muted-foreground">Manual entry by code/ticker. External lookup can be plugged in later.</p>
      <form action={createSecurity} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input name="name" placeholder="Name" required />
        <Input name="code" placeholder="Code / Ticker" required />
        <Input name="isin" placeholder="ISIN (optional)" />
        <select
          name="type"
          className="h-11 rounded-md border border-border bg-background px-3 text-sm"
          required
          defaultValue={SecurityType.INDEX_FUND}
        >
          {SECURITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Input name="currency" placeholder="Currency (e.g. USD)" required defaultValue="USD" />
        <Input name="provider" placeholder="Provider (optional)" />
        <div className="sm:col-span-2 lg:col-span-3">
          <Input name="source" placeholder="Source / Notes (optional)" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit">Save security</Button>
        </div>
      </form>
    </section>
  );
}

export function TransactionCreateForm({ securities }: { securities: Security[] }) {
  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Add transaction</h2>
      <p className="mt-1 text-sm text-muted-foreground">Capture manual buy/sell transactions and derive positions from them.</p>
      {securities.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Add at least one security before you can register transactions.
        </p>
      ) : (
        <form action={createTransaction} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select name="securityId" className="h-11 rounded-md border border-border bg-background px-3 text-sm" required>
            {securities.map((security) => (
              <option key={security.id} value={security.id}>{`${security.code} · ${security.name}`}</option>
            ))}
          </select>
          <select name="type" className="h-11 rounded-md border border-border bg-background px-3 text-sm" required defaultValue={TransactionType.BUY}>
            {TRANSACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input name="transactedOn" type="date" required />
          <Input name="quantity" type="number" min="0.000001" step="0.000001" placeholder="Quantity" required />
          <Input name="price" type="number" min="0.0001" step="0.0001" placeholder="Price" required />
          <Input name="fees" type="number" min="0" step="0.01" placeholder="Fees (optional)" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input name="notes" placeholder="Notes (optional)" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit">Save transaction</Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function HoldingsTable({ holdings }: { holdings: HoldingPosition[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Code</th>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Quantity</th>
            <th className="py-2 pr-3 font-medium">Avg. Price</th>
            <th className="py-2 pr-3 font-medium">Invested</th>
            <th className="py-2 font-medium">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.securityId} className="border-b border-border/70">
              <td className="py-2 pr-3 font-medium">{holding.code}</td>
              <td className="py-2 pr-3">{holding.name}</td>
              <td className="py-2 pr-3">{SECURITY_TYPE_LABELS[holding.type]}</td>
              <td className="py-2 pr-3">{formatQuantity(holding.quantity)}</td>
              <td className="py-2 pr-3">{formatAmount(holding.averagePrice)} {holding.currency}</td>
              <td className="py-2 pr-3">{formatAmount(holding.investedAmount)} {holding.currency}</td>
              <td className="py-2">{holding.transactionCount}</td>
            </tr>
          ))}
          {holdings.length === 0 ? (
            <tr>
              <td className="py-3 text-muted-foreground" colSpan={7}>
                No holdings yet. Add transactions to build your current positions.
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
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Security</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Quantity</th>
            <th className="py-2 pr-3 font-medium">Price</th>
            <th className="py-2 pr-3 font-medium">Fees</th>
            <th className="py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-border/70">
              <td className="py-2 pr-3">{transaction.transactedOn.toISOString().slice(0, 10)}</td>
              <td className="py-2 pr-3">{transaction.security.code}</td>
              <td className="py-2 pr-3">{transaction.type}</td>
              <td className="py-2 pr-3">{formatQuantity(transaction.quantity.toNumber())}</td>
              <td className="py-2 pr-3">{formatAmount(transaction.price.toNumber())}</td>
              <td className="py-2 pr-3">{formatAmount(transaction.fees?.toNumber() ?? 0)}</td>
              <td className="py-2">{transaction.notes || "-"}</td>
            </tr>
          ))}
          {transactions.length === 0 ? (
            <tr>
              <td className="py-3 text-muted-foreground" colSpan={7}>
                No transactions yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function SecurityTable({
  title,
  description,
  securities,
}: {
  title: string;
  description: string;
  securities: Security[];
}) {
  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">Code</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">ISIN</th>
              <th className="py-2 pr-3 font-medium">Currency</th>
              <th className="py-2 pr-3 font-medium">Provider</th>
              <th className="py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {securities.map((security) => (
              <tr key={security.id} className="border-b border-border/70">
                <td className="py-2 pr-3 font-medium">{security.code}</td>
                <td className="py-2 pr-3">{security.name}</td>
                <td className="py-2 pr-3">{security.isin || "-"}</td>
                <td className="py-2 pr-3">{security.currency}</td>
                <td className="py-2 pr-3">{security.provider || "-"}</td>
                <td className="py-2">{security.source || "-"}</td>
              </tr>
            ))}
            {securities.length === 0 ? (
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={6}>
                  No securities in this category yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
