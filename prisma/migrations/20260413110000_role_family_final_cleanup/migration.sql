-- Final cleanup for legacy global Role.FAMILY values/defaults.
-- Keeps company membership roles isolated in CompanyRole enum.
DO $$
DECLARE
  has_family boolean;
  col record;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'Role'
      AND e.enumlabel = 'FAMILY'
  ) INTO has_family;

  IF has_family THEN
    -- Drop any column defaults that still reference FAMILY before enum conversion.
    FOR col IN
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        a.attname AS column_name,
        pg_get_expr(d.adbin, d.adrelid) AS default_expr
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_type t ON t.oid = a.atttypid
      JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attnum > 0
        AND NOT a.attisdropped
        AND c.relkind = 'r'
        AND t.typname = 'Role'
        AND pg_get_expr(d.adbin, d.adrelid) LIKE '%FAMILY%'
    LOOP
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
        col.schema_name,
        col.table_name,
        col.column_name
      );
    END LOOP;

    -- Migrate legacy user role values from FAMILY to USER.
    IF to_regclass('public."User"') IS NOT NULL THEN
      UPDATE public."User"
      SET "role" = 'USER'::"Role"
      WHERE "role"::text = 'FAMILY';
    END IF;

    -- Recreate Role enum without FAMILY.
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'USER');

    -- Convert all columns using Role to Role_new.
    FOR col IN
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        a.attname AS column_name
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE a.attnum > 0
        AND NOT a.attisdropped
        AND c.relkind = 'r'
        AND t.typname = 'Role'
    LOOP
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I TYPE "Role_new" USING (%I::text::"Role_new")',
        col.schema_name,
        col.table_name,
        col.column_name,
        col.column_name
      );
    END LOOP;

    ALTER TYPE "Role" RENAME TO "Role_old";
    ALTER TYPE "Role_new" RENAME TO "Role";
    DROP TYPE "Role_old";
  END IF;

  -- Ensure User.role default is USER after cleanup.
  IF to_regclass('public."User"') IS NOT NULL THEN
    ALTER TABLE public."User" ALTER COLUMN "role" SET DEFAULT 'USER'::"Role";
  END IF;
END $$;
