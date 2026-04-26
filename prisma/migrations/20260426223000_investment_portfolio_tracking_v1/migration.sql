-- Portfolio tracking v1: per-user security uniqueness and manual price fallback

CREATE TABLE "ManualSecurityPrice" (
    "id" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "pricedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualSecurityPrice_pkey" PRIMARY KEY ("id")
);

DROP INDEX "Security_code_key";
DROP INDEX "Security_isin_key";

CREATE UNIQUE INDEX "Security_createdById_code_key" ON "Security"("createdById", "code");
CREATE UNIQUE INDEX "Security_createdById_isin_key" ON "Security"("createdById", "isin");

CREATE UNIQUE INDEX "ManualSecurityPrice_createdById_securityId_key" ON "ManualSecurityPrice"("createdById", "securityId");
CREATE INDEX "ManualSecurityPrice_securityId_idx" ON "ManualSecurityPrice"("securityId");

ALTER TABLE "ManualSecurityPrice" ADD CONSTRAINT "ManualSecurityPrice_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualSecurityPrice" ADD CONSTRAINT "ManualSecurityPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
