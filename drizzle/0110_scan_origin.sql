ALTER TABLE "collection_cards" ADD COLUMN "scanned_by_user_id" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "scanned_by_device_id" integer;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN "scanned_by_user_id" text;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN "scanned_by_device_id" integer;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_scanned_by_device_id_devices_id_fk" FOREIGN KEY ("scanned_by_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD CONSTRAINT "unmatched_cards_scanned_by_device_id_devices_id_fk" FOREIGN KEY ("scanned_by_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;