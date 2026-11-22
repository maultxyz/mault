ALTER TABLE "card_reservations" ADD COLUMN "fulfilment_order_id" integer;--> statement-breakpoint
ALTER TABLE "card_reservations" ADD COLUMN "pulled_at" timestamp;--> statement-breakpoint
CREATE INDEX "card_reservations_fulfilment_order_idx" ON "card_reservations" USING btree ("fulfilment_order_id");