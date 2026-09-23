DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cards_v2'
  ) THEN
    DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "cards_v2" CASCADE;
    DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "cards_v2" CASCADE;
    DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "cards_v2" CASCADE;
    DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "cards_v2" CASCADE;
    DROP TABLE "cards_v2" CASCADE;
  END IF;
END $$;
