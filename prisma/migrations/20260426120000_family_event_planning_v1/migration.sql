-- Family event planning v1: share token + public participant voting
ALTER TABLE "FamilyEvent"
  ADD COLUMN "shareToken" TEXT,
  ALTER COLUMN "description" DROP NOT NULL;

UPDATE "FamilyEvent"
SET "shareToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "shareToken" IS NULL;

ALTER TABLE "FamilyEvent"
  ALTER COLUMN "shareToken" SET NOT NULL;

CREATE UNIQUE INDEX "FamilyEvent_shareToken_key" ON "FamilyEvent"("shareToken");

ALTER TABLE "Vote"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "participantName" TEXT;

UPDATE "Vote" v
SET
  "eventId" = edo."eventId",
  "participantName" = COALESCE(u."name", u."email", 'Ukendt deltager')
FROM "EventDateOption" edo
LEFT JOIN "User" u ON u."id" = v."userId"
WHERE v."dateOptionId" = edo."id";

ALTER TABLE "Vote"
  ALTER COLUMN "eventId" SET NOT NULL,
  ALTER COLUMN "participantName" SET NOT NULL;

ALTER TABLE "Vote"
  ADD CONSTRAINT "Vote_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "FamilyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Vote_userId_dateOptionId_key";
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_userId_fkey";
ALTER TABLE "Vote" DROP COLUMN IF EXISTS "userId";

CREATE INDEX "Vote_eventId_participantName_idx" ON "Vote"("eventId", "participantName");
CREATE UNIQUE INDEX "Vote_eventId_participantName_dateOptionId_key"
  ON "Vote"("eventId", "participantName", "dateOptionId");
