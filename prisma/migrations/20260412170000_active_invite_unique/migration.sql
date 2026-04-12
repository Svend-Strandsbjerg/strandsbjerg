-- Enforce at most one active invite per company + candidate email.
-- Partial unique index excludes null emails and non-active statuses.
CREATE UNIQUE INDEX "assessment_invites_active_candidate_unique"
ON "AssessmentInvite" ("companyId", "candidateEmail")
WHERE "status" = 'ACTIVE' AND "candidateEmail" IS NOT NULL;
