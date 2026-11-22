ALTER TABLE "card_reservations" ADD COLUMN "price_at_reservation" double precision;--> statement-breakpoint
ALTER TABLE "card_reservations" ADD COLUMN "price_currency" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "sell_markup_percent" double precision;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "sell_price_fixed" double precision;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "sell_price_currency" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "intake_offer" double precision;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "intake_offer_currency" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "sell_config" jsonb;--> statement-breakpoint
UPDATE "collection_cards" AS cc
SET "intake_offer" = cc."acquisition_cost",
  "intake_offer_currency" = cc."acquisition_currency",
  "acquisition_cost" = NULL,
  "acquisition_currency" = NULL
FROM "intake_lots" AS il
WHERE il."id" = cc."intake_lot_id"
  AND il."status" = 'open'
  AND cc."acquisition_cost" IS NOT NULL;
