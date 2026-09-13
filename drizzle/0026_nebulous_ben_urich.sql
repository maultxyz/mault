ALTER TABLE "bin_sets" ADD COLUMN "is_repack_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "repack_slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "repack_allow_duplicates" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "match_threshold" integer;