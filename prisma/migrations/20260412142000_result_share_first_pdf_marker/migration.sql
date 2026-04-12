-- Add a persistent marker for first PDF download of each shared result.
ALTER TABLE "AssessmentResultShare"
ADD COLUMN "firstPdfDownloadedAt" TIMESTAMP(3);
