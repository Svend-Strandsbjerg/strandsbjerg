import { SecurityType, type InvestmentTransaction, type Security } from "@prisma/client";

import { requireInvestmentAccessUser } from "@/lib/access";
import { deriveHoldings, type HoldingPosition, type SecurityWithTransactions } from "@/lib/investments";
import { createMarketDataService } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

export type PortfolioData = {
  securities: SecurityWithTransactions[];
  transactions: Array<InvestmentTransaction & { security: Security }>;
  holdings: HoldingPosition[];
  totalInvested: number;
  marketDataProvider: string;
  typeBreakdown: Record<SecurityType, { securityCount: number; holdingCount: number; investedAmount: number }>;
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const user = await requireInvestmentAccessUser();

  const [securities, transactions] = await Promise.all([
    prisma.security.findMany({
      where: { createdById: user.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        transactions: {
          where: { createdById: user.id },
          orderBy: { transactedOn: "desc" },
        },
        manualPrices: {
          where: { createdById: user.id },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.investmentTransaction.findMany({
      where: { createdById: user.id },
      orderBy: [{ transactedOn: "desc" }, { createdAt: "desc" }],
      include: {
        security: true,
      },
    }),
  ]);

  const marketDataService = createMarketDataService();
  const latestLivePrices = new Map<string, { price: number; asOf: Date }>();

  await Promise.all(
    securities
      .filter((security) => Boolean(security.isin))
      .map(async (security) => {
        if (!security.isin) return;
        const quote = await marketDataService.getLatestPrice(security.isin);
        if (quote?.price) {
          latestLivePrices.set(security.isin, { price: quote.price, asOf: quote.asOf });
        }
      }),
  );

  const holdings = deriveHoldings(securities, latestLivePrices);
  const totalInvested = holdings.reduce((sum, holding) => sum + holding.investedAmount, 0);

  const typeBreakdown = Object.values(SecurityType).reduce(
    (acc, securityType) => {
      acc[securityType] = { securityCount: 0, holdingCount: 0, investedAmount: 0 };
      return acc;
    },
    {} as Record<SecurityType, { securityCount: number; holdingCount: number; investedAmount: number }>,
  );

  for (const security of securities) {
    typeBreakdown[security.type].securityCount += 1;
  }

  for (const holding of holdings) {
    typeBreakdown[holding.type].holdingCount += 1;
    typeBreakdown[holding.type].investedAmount += holding.investedAmount;
  }

  return {
    securities,
    transactions,
    holdings,
    totalInvested,
    marketDataProvider: marketDataService.getProviderName(),
    typeBreakdown,
  };
}
