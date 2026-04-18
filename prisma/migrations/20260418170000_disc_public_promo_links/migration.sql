-- CreateEnum
CREATE TYPE "DiscPromoGrantType" AS ENUM ('FREE_DISC_CREDIT');

-- AlterTable
ALTER TABLE "DiscAssessment" ADD COLUMN "promoRedemptionId" TEXT;

-- CreateTable
CREATE TABLE "DiscPromoLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "companyId" TEXT,
    "grantType" "DiscPromoGrantType" NOT NULL DEFAULT 'FREE_DISC_CREDIT',
    "grantTier" "DiscTierAccess" NOT NULL DEFAULT 'FREE',
    "grantCredits" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "oneRedemptionPerUser" BOOLEAN NOT NULL DEFAULT true,
    "maxRedemptions" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "totalRedemptions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscPromoLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscPromoRedemption" (
    "id" TEXT NOT NULL,
    "promoLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedCredits" INTEGER NOT NULL DEFAULT 1,
    "consumedCredits" INTEGER NOT NULL DEFAULT 0,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "DiscPromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscPromoLink_token_key" ON "DiscPromoLink"("token");

-- CreateIndex
CREATE INDEX "DiscPromoLink_companyId_active_idx" ON "DiscPromoLink"("companyId", "active");

-- CreateIndex
CREATE INDEX "DiscPromoLink_expiresAt_idx" ON "DiscPromoLink"("expiresAt");

-- CreateIndex
CREATE INDEX "DiscPromoRedemption_promoLinkId_userId_idx" ON "DiscPromoRedemption"("promoLinkId", "userId");

-- CreateIndex
CREATE INDEX "DiscPromoRedemption_userId_redeemedAt_idx" ON "DiscPromoRedemption"("userId", "redeemedAt");

-- CreateIndex
CREATE INDEX "DiscAssessment_promoRedemptionId_idx" ON "DiscAssessment"("promoRedemptionId");

-- AddForeignKey
ALTER TABLE "DiscAssessment" ADD CONSTRAINT "DiscAssessment_promoRedemptionId_fkey" FOREIGN KEY ("promoRedemptionId") REFERENCES "DiscPromoRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscPromoLink" ADD CONSTRAINT "DiscPromoLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscPromoLink" ADD CONSTRAINT "DiscPromoLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscPromoRedemption" ADD CONSTRAINT "DiscPromoRedemption_promoLinkId_fkey" FOREIGN KEY ("promoLinkId") REFERENCES "DiscPromoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscPromoRedemption" ADD CONSTRAINT "DiscPromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
