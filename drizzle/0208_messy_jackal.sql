ALTER TABLE "card_sales" ADD COLUMN "intake_lot_id" integer;--> statement-breakpoint
ALTER TABLE "intake_lots" ADD COLUMN "source_type" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "intake_lots" ADD COLUMN "destination_location_id" integer;