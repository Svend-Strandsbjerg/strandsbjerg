import { SecurityType } from "@prisma/client";

import { SecurityCreateForm, SecurityTable } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";

export const dynamic = "force-dynamic";

export default async function EtfsPage() {
  const { securities } = await getPortfolioData();
  const etfs = securities.filter((security) => security.type === SecurityType.ETF);

  return (
    <div className="space-y-6 sm:space-y-8">
      <SecurityTable
        title="ETFs"
        description="Exchange-traded funds configured in the securities catalog."
        securities={etfs}
      />
      <SecurityCreateForm />
    </div>
  );
}
