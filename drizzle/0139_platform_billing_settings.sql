CREATE TABLE "platform_billing_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"is_legacy_pricing_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
