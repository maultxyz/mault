ALTER TABLE "card_reservations" ADD COLUMN "guest_user_id" text;--> statement-breakpoint
ALTER TABLE "card_reservations" ADD COLUMN "guest_alert" text;--> statement-breakpoint
ALTER TABLE "card_reservations" ADD COLUMN "guest_alert_at" timestamp;--> statement-breakpoint
CREATE INDEX "card_reservations_guest_user_idx" ON "card_reservations" USING btree ("guest_user_id","created_at");