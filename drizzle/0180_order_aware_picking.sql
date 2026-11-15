ALTER TABLE "card_sales" ADD COLUMN "order_ref" text;--> statement-breakpoint
ALTER TABLE "fulfilment_orders" ADD COLUMN "order_bins" jsonb DEFAULT '{}'::jsonb NOT NULL;