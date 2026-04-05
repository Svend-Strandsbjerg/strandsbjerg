import { SecurityType, TransactionType, type InvestmentTransaction, type Security } from "@prisma/client";

export type SecurityWithTransactions = Security & {
  transactions: InvestmentTransaction[];
};

export type HoldingPosition = {
  securityId: string;
  code: string;
  name: string;
  type: SecurityType;
  currency: string;
  quantity: number;
  investedAmount: number;
  averagePrice: number;
  transactionCount: number;
};

export const SECURITY_TYPE_LABELS: Record<SecurityType, string> = {
  [SecurityType.STOCK]: "Stocks",
  [SecurityType.INDEX_FUND]: "Index Funds",
  [SecurityType.ETF]: "ETFs",
  [SecurityType.OTHER]: "Other",
};

export const SECURITY_TYPE_OPTIONS: Array<{ value: SecurityType; label: string }> = [
  { value: SecurityType.INDEX_FUND, label: "Index fund" },
  { value: SecurityType.STOCK, label: "Stock" },
  { value: SecurityType.ETF, label: "ETF" },
  { value: SecurityType.OTHER, label: "Other" },
];

export const TRANSACTION_TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: TransactionType.BUY, label: "Buy" },
  { value: TransactionType.SELL, label: "Sell" },
];

export const INVESTMENTS_TABS = [
  { href: "/m4z8r2q9t7y1", label: "Overview" },
  { href: "/m4z8r2q9t7y1/index-funds", label: "Index Funds" },
  { href: "/m4z8r2q9t7y1/stocks", label: "Stocks" },
  { href: "/m4z8r2q9t7y1/etfs", label: "ETFs" },
  { href: "/m4z8r2q9t7y1/transactions", label: "Transactions" },
  { href: "/m4z8r2q9t7y1/holdings", label: "Holdings" },
] as const;

function transactionDirection(type: TransactionType) {
  return type === TransactionType.SELL ? -1 : 1;
}

export function deriveHoldings(securities: SecurityWithTransactions[]): HoldingPosition[] {
  return securities
    .map((security) => {
      let quantity = 0;
      let investedAmount = 0;

      for (const transaction of security.transactions) {
        const factor = transactionDirection(transaction.type);
        const transactionQuantity = transaction.quantity.toNumber() * factor;
        const fees = transaction.fees?.toNumber() ?? 0;

        quantity += transactionQuantity;
        investedAmount += transactionQuantity * transaction.price.toNumber() + fees;
      }

      return {
        securityId: security.id,
        code: security.code,
        name: security.name,
        type: security.type,
        currency: security.currency,
        quantity,
        investedAmount,
        averagePrice: quantity > 0 ? investedAmount / quantity : 0,
        transactionCount: security.transactions.length,
      };
    })
    .filter((position) => position.quantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value);
}
