-- CreateEnum
CREATE TYPE "DiscTierAccess" AS ENUM ('FREE', 'STANDARD', 'DEEP');

-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "discMaxTierAccess" "DiscTierAccess" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "discMaxTierOverride" "DiscTierAccess";
