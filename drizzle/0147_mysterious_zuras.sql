ALTER TABLE "bin_sets" ADD COLUMN "parent_guid" uuid;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "parent_bin_number" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "bin_sets_parent_bin_idx" ON "bin_sets" USING btree ("parent_guid","parent_bin_number") WHERE "bin_sets"."is_deleted" = false AND "bin_sets"."parent_guid" IS NOT NULL;