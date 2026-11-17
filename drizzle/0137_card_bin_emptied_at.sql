ALTER TABLE "collection_cards" ADD COLUMN "bin_emptied_at" timestamp;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN "bin_emptied_at" timestamp;--> statement-breakpoint
UPDATE "collection_cards" AS cc
SET "bin_emptied_at" = emptied.emptied_at
FROM (
  SELECT "org_id", "bin_number", max("last_emptied_at") AS emptied_at
  FROM "bins"
  WHERE "last_emptied_at" IS NOT NULL
  GROUP BY "org_id", "bin_number"
) AS emptied
WHERE cc."org_id" = emptied."org_id"
  AND cc."bin_number" = emptied."bin_number"
  AND cc."scanned_at" <= emptied.emptied_at;--> statement-breakpoint
UPDATE "unmatched_cards" AS u
SET "bin_emptied_at" = emptied.emptied_at
FROM (
  SELECT "org_id", "bin_number", max("last_emptied_at") AS emptied_at
  FROM "bins"
  WHERE "last_emptied_at" IS NOT NULL
  GROUP BY "org_id", "bin_number"
) AS emptied
WHERE u."org_id" = emptied."org_id"
  AND u."bin_number" = emptied."bin_number"
  AND u."scanned_at" <= emptied.emptied_at;--> statement-breakpoint
CREATE INDEX "collection_cards_org_bin_emptied_idx" ON "collection_cards" USING btree ("org_id","bin_number","bin_emptied_at");--> statement-breakpoint
CREATE INDEX "unmatched_cards_org_bin_emptied_idx" ON "unmatched_cards" USING btree ("org_id","bin_number","bin_emptied_at");--> statement-breakpoint
ALTER TABLE "bins" DROP COLUMN "last_emptied_at";