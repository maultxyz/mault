ALTER TABLE "cards" ADD COLUMN "is_rare_printing" boolean;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "is_promo_printing" boolean;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "printed_language_code" boolean;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "printed_set_total" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "is_excluded_from_matching" boolean;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "match_flags_fingerprint" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "match_flags_source_updated_at" timestamp;