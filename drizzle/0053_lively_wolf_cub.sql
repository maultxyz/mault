ALTER TABLE "bin_sets" ADD COLUMN "is_alphabet_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "alphabet_pass" integer DEFAULT 0 NOT NULL;