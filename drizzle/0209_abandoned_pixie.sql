CREATE TABLE "customer_status_messages" (
	"user_id" text PRIMARY KEY NOT NULL,
	"trade_offers_enabled_at" timestamp,
	"card_reservations_enabled_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_status_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "card_reservations" ADD COLUMN "guest_alert_messaged_at" timestamp;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "status_messaged_at" timestamp;--> statement-breakpoint
UPDATE "trade_offers" SET "status_messaged_at" = "responded_at" WHERE "responded_at" IS NOT NULL;--> statement-breakpoint
UPDATE "card_reservations" SET "guest_alert_messaged_at" = "guest_alert_at" WHERE "guest_alert" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "card_reservations_unmessaged_alert_idx" ON "card_reservations" USING btree ("org_id") WHERE "card_reservations"."guest_alert" IS NOT NULL AND "card_reservations"."guest_user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "trade_offers_unmessaged_status_idx" ON "trade_offers" USING btree ("org_id") WHERE "trade_offers"."status_messaged_at" IS NULL AND "trade_offers"."responded_at" IS NOT NULL AND "trade_offers"."guest_user_id" IS NOT NULL;