-- Map legacy FAMILY users to USER before narrowing global role enum.
UPDATE "User"
SET "role" = 'USER'::"Role"
WHERE "role" = 'FAMILY'::"Role";

-- Remove FAMILY from Role enum while keeping existing values.
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");

ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"Role";
