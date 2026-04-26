import { SecurityType, TransactionType, type InvestmentTransaction, type ManualSecurityPrice, type Security } from "@prisma/client";

export type SecurityWithTransactions = Security & {
  transactions: InvestmentTransaction[];
  manualPrices: ManualSecurityPrice[];
};

export type HoldingPosition = {
  securityId: string;
  isin: string;
  name: string;
  type: SecurityType;
  currency: string;
  totalQuantity: number;
  investedAmount: number;
  averagePurchasePrice: number;
  transactionCount: number;
  latestMarketPrice: number | null;
  latestMarketPriceSource: "LIVE" | "MANUAL" | "UNAVAILABLE";
  latestMarketPriceAsOf: Date | null;
  latestMarketValue: number | null;
  gainLossAmount: number | null;
  gainLossPercent: number | null;
};

export const SECURITY_TYPE_LABELS: Record<SecurityType, string> = {
  [SecurityType.STOCK]: "Aktier",
  [SecurityType.INDEX_FUND]: "Indeksfonde",
  [SecurityType.ETF]: "ETF'er",
  [SecurityType.OTHER]: "Andet",
};

export const INVESTMENTS_TABS = [
  { href: "/m4z8r2q9t7y1", label: "Overblik" },
  { href: "/m4z8r2q9t7y1/transactions", label: "Transaktioner" },
  { href: "/m4z8r2q9t7y1/holdings", label: "Beholdninger" },
] as const;

function transactionDirection(type: TransactionType) {
  return type === TransactionType.SELL ? -1 : 1;
}

export function deriveHoldings(securities: SecurityWithTransactions[], latestLivePrices: Map<string, { price: number; asOf: Date }>) {
  return securities
    .map((security): HoldingPosition => {
      let totalQuantity = 0;
      let investedAmount = 0;

      for (const transaction of security.transactions) {
        const factor = transactionDirection(transaction.type);
        const transactionQuantity = transaction.quantity.toNumber() * factor;
        const fees = transaction.fees?.toNumber() ?? 0;

        totalQuantity += transactionQuantity;
        investedAmount += transactionQuantity * transaction.price.toNumber() + fees;
      }

      const livePrice = security.isin ? latestLivePrices.get(security.isin) : undefined;
      const manualPrice = security.manualPrices[0];
      const latestMarketPrice = livePrice?.price ?? manualPrice?.price.toNumber() ?? null;
      const latestMarketPriceAsOf = livePrice?.asOf ?? manualPrice?.pricedAt ?? null;

      let latestMarketPriceSource: HoldingPosition["latestMarketPriceSource"] = "UNAVAILABLE";
      if (livePrice) latestMarketPriceSource = "LIVE";
      else if (manualPrice) latestMarketPriceSource = "MANUAL";

      const latestMarketValue = latestMarketPrice !== null ? latestMarketPrice * totalQuantity : null;
      const gainLossAmount = latestMarketValue !== null ? latestMarketValue - investedAmount : null;
      const gainLossPercent = gainLossAmount !== null && investedAmount > 0 ? (gainLossAmount / investedAmount) * 100 : null;

      return {
        securityId: security.id,
        isin: security.isin ?? "-",
        name: security.name,
        type: security.type,
        currency: security.currency,
        totalQuantity,
        investedAmount,
        averagePurchasePrice: totalQuantity > 0 ? investedAmount / totalQuantity : 0,
        transactionCount: security.transactions.length,
        latestMarketPrice,
        latestMarketPriceSource,
        latestMarketPriceAsOf,
        latestMarketValue,
        gainLossAmount,
        gainLossPercent,
      };
    })
    .filter((position) => position.totalQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value);
}
