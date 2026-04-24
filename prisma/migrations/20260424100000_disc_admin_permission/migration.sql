-- Add explicit DISC admin permission flag separate from global/company roles
ALTER TABLE "User"
ADD COLUMN "isDiscAdmin" BOOLEAN NOT NULL DEFAULT false;
