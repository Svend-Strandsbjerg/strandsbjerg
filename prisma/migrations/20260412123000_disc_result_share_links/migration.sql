-- CreateTable
CREATE TABLE "AssessmentResultShare" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentResultShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResultShare_assessmentId_key" ON "AssessmentResultShare"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResultShare_token_key" ON "AssessmentResultShare"("token");

-- CreateIndex
CREATE INDEX "AssessmentResultShare_token_idx" ON "AssessmentResultShare"("token");

-- CreateIndex
CREATE INDEX "AssessmentResultShare_expiresAt_idx" ON "AssessmentResultShare"("expiresAt");

-- AddForeignKey
ALTER TABLE "AssessmentResultShare" ADD CONSTRAINT "AssessmentResultShare_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "DiscAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
