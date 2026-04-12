-- Reconcile DB drift for DISC/company schema so Prisma models and tables align.
-- This migration is intentionally idempotent: safe to run on partially-synced databases.

-- Ensure DISC/company enums exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyRole') THEN
    CREATE TYPE "CompanyRole" AS ENUM ('COMPANY_ADMIN', 'COMPANY_RECRUITER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssessmentInviteStatus') THEN
    CREATE TYPE "AssessmentInviteStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INVALIDATED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscAssessmentStatus') THEN
    CREATE TYPE "DiscAssessmentStatus" AS ENUM ('STARTED', 'SUBMITTED', 'FAILED');
  END IF;
END
$$;

-- Resolve enum drift where types exist but are missing required values.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyRole') THEN
    ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'COMPANY_ADMIN';
    ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'COMPANY_RECRUITER';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssessmentInviteStatus') THEN
    ALTER TYPE "AssessmentInviteStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
    ALTER TYPE "AssessmentInviteStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
    ALTER TYPE "AssessmentInviteStatus" ADD VALUE IF NOT EXISTS 'INVALIDATED';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscAssessmentStatus') THEN
    ALTER TYPE "DiscAssessmentStatus" ADD VALUE IF NOT EXISTS 'STARTED';
    ALTER TYPE "DiscAssessmentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
    ALTER TYPE "DiscAssessmentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
  END IF;
END
$$;

-- Core DISC/company tables.
CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompanyMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "role" "CompanyRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "candidateName" TEXT,
  "candidateEmail" TEXT,
  "status" "AssessmentInviteStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DiscAssessment" (
  "id" TEXT NOT NULL,
  "externalSessionId" TEXT NOT NULL,
  "assessmentVersionId" TEXT NOT NULL,
  "userId" TEXT,
  "inviteId" TEXT,
  "companyId" TEXT,
  "candidateName" TEXT,
  "candidateEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "status" "DiscAssessmentStatus" NOT NULL DEFAULT 'STARTED',
  "rawResponses" JSONB,
  CONSTRAINT "DiscAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentResultShare" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "firstPdfDownloadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentResultShare_pkey" PRIMARY KEY ("id")
);

-- Add columns that may be missing on pre-existing tables.
ALTER TABLE "AssessmentResultShare"
  ADD COLUMN IF NOT EXISTS "firstPdfDownloadedAt" TIMESTAMP(3);

-- Required unique constraints and indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyMembership_userId_companyId_key"
  ON "CompanyMembership"("userId", "companyId");
CREATE INDEX IF NOT EXISTS "CompanyMembership_companyId_idx"
  ON "CompanyMembership"("companyId");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentInvite_token_key"
  ON "AssessmentInvite"("token");
CREATE INDEX IF NOT EXISTS "AssessmentInvite_companyId_status_idx"
  ON "AssessmentInvite"("companyId", "status");
CREATE INDEX IF NOT EXISTS "AssessmentInvite_expiresAt_idx"
  ON "AssessmentInvite"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_invites_active_candidate_unique"
  ON "AssessmentInvite"("companyId", "candidateEmail")
  WHERE "status" = 'ACTIVE' AND "candidateEmail" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "DiscAssessment_externalSessionId_key"
  ON "DiscAssessment"("externalSessionId");
CREATE INDEX IF NOT EXISTS "DiscAssessment_userId_createdAt_idx"
  ON "DiscAssessment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "DiscAssessment_companyId_createdAt_idx"
  ON "DiscAssessment"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "DiscAssessment_inviteId_idx"
  ON "DiscAssessment"("inviteId");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentResultShare_assessmentId_key"
  ON "AssessmentResultShare"("assessmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentResultShare_token_key"
  ON "AssessmentResultShare"("token");
CREATE INDEX IF NOT EXISTS "AssessmentResultShare_token_idx"
  ON "AssessmentResultShare"("token");
CREATE INDEX IF NOT EXISTS "AssessmentResultShare_expiresAt_idx"
  ON "AssessmentResultShare"("expiresAt");

-- Foreign keys: add only when absent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyMembership_userId_fkey') THEN
    ALTER TABLE "CompanyMembership"
      ADD CONSTRAINT "CompanyMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyMembership_companyId_fkey') THEN
    ALTER TABLE "CompanyMembership"
      ADD CONSTRAINT "CompanyMembership_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentInvite_companyId_fkey') THEN
    ALTER TABLE "AssessmentInvite"
      ADD CONSTRAINT "AssessmentInvite_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentInvite_createdByUserId_fkey') THEN
    ALTER TABLE "AssessmentInvite"
      ADD CONSTRAINT "AssessmentInvite_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscAssessment_userId_fkey') THEN
    ALTER TABLE "DiscAssessment"
      ADD CONSTRAINT "DiscAssessment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscAssessment_inviteId_fkey') THEN
    ALTER TABLE "DiscAssessment"
      ADD CONSTRAINT "DiscAssessment_inviteId_fkey"
      FOREIGN KEY ("inviteId") REFERENCES "AssessmentInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscAssessment_companyId_fkey') THEN
    ALTER TABLE "DiscAssessment"
      ADD CONSTRAINT "DiscAssessment_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentResultShare_assessmentId_fkey') THEN
    ALTER TABLE "AssessmentResultShare"
      ADD CONSTRAINT "AssessmentResultShare_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "DiscAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
