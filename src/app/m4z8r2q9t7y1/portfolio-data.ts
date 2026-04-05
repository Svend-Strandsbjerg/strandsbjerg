import { SecurityType, type InvestmentTransaction, type Security } from "@prisma/client";

import { deriveHoldings, type HoldingPosition, type SecurityWithTransactions } from "@/lib/investments";
import { prisma } from "@/lib/prisma";

export type PortfolioData = {
  securities: SecurityWithTransactions[];
  transactions: Array<InvestmentTransaction & { security: Security }>;
  holdings: HoldingPosition[];
  totalInvested: number;
  typeBreakdown: Record<SecurityType, { securityCount: number; holdingCount: number; investedAmount: number }>;
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const [securities, transactions] = await Promise.all([
    prisma.security.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        transactions: {
          orderBy: { transactedOn: "desc" },
        },
      },
    }),
    prisma.investmentTransaction.findMany({
      orderBy: [{ transactedOn: "desc" }, { createdAt: "desc" }],
      include: {
        security: true,
      },
    }),
  ]);

  const holdings = deriveHoldings(securities);
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
    typeBreakdown,
  };
}
