import { SecurityType } from "@prisma/client";

import { SecurityCreateForm, SecurityTable } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const { securities } = await getPortfolioData();
  const stocks = securities.filter((security) => security.type === SecurityType.STOCK);

  return (
    <div className="space-y-6 sm:space-y-8">
      <SecurityTable
        title="Stocks"
        description="Equity instruments tracked in the portfolio master data."
        securities={stocks}
      />
      <SecurityCreateForm />
    </div>
  );
}
