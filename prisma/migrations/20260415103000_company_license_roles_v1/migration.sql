-- Introduce company licensing/status fields and role model cleanup.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyRole')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyRole_new') THEN
    CREATE TYPE "CompanyRole_new" AS ENUM ('COMPANY_ADMIN', 'COMPANY_VIEWER');

    ALTER TABLE "CompanyMembership"
      ALTER COLUMN "role" TYPE "CompanyRole_new"
      USING (
        CASE
          WHEN "role"::text = 'COMPANY_RECRUITER' THEN 'COMPANY_VIEWER'
          ELSE "role"::text
        END
      )::"CompanyRole_new";

    DROP TYPE "CompanyRole";
    ALTER TYPE "CompanyRole_new" RENAME TO "CompanyRole";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyStatus') THEN
    CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyLicenseStatus') THEN
    CREATE TYPE "CompanyLicenseStatus" AS ENUM ('ACTIVE', 'TRIAL', 'INACTIVE', 'EXPIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyPlanTier') THEN
    CREATE TYPE "CompanyPlanTier" AS ENUM ('FREE', 'STANDARD', 'ENTERPRISE');
  END IF;
END $$;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "licenseStatus" "CompanyLicenseStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "planTier" "CompanyPlanTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "seatLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "selfServiceCreationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);

UPDATE "Company"
SET "activatedAt" = COALESCE("activatedAt", "createdAt")
WHERE "status" = 'ACTIVE' AND "licenseStatus" IN ('ACTIVE', 'TRIAL');
