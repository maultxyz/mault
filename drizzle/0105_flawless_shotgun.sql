ALTER TABLE "org_settings" ADD COLUMN "leaderboard_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_stats" ADD COLUMN "org_id" text;--> statement-breakpoint
CREATE INDEX "scan_stats_org_idx" ON "scan_stats" USING btree ("org_id");--> statement-breakpoint
UPDATE "scan_stats" s SET "org_id" = cc."org_id" FROM "collection_cards" cc WHERE cc."guid" = s."scan_id" AND s."org_id" IS NULL;--> statement-breakpoint
UPDATE "scan_stats" s SET "org_id" = uc."org_id" FROM "unmatched_cards" uc WHERE uc."guid" = s."scan_id" AND s."org_id" IS NULL;
