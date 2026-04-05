import { SecurityType } from "@prisma/client";

import { SecurityCreateForm, SecurityTable } from "@/app/m4z8r2q9t7y1/components";
import { getPortfolioData } from "@/app/m4z8r2q9t7y1/portfolio-data";

export const dynamic = "force-dynamic";

export default async function IndexFundsPage() {
  const { securities } = await getPortfolioData();
  const indexFunds = securities.filter((security) => security.type === SecurityType.INDEX_FUND);

  return (
    <div className="space-y-6 sm:space-y-8">
      <SecurityTable
        title="Index funds"
        description="Master data for index funds. Use this as the base for future transactions and reporting."
        securities={indexFunds}
      />
      <SecurityCreateForm />
    </div>
  );
}
