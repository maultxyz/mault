CREATE TABLE "accuracy_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"collection_id" integer NOT NULL,
	"intake_lot_id" integer,
	"sample_size" integer NOT NULL,
	"samples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by_user_id" text,
	"completed_at" timestamp,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accuracy_checks_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "accuracy_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "card_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"order_id" integer,
	"scan_id" uuid,
	"card_id" text NOT NULL,
	"card_name" text NOT NULL,
	"set_code" text,
	"collector_number" text,
	"is_foil" boolean DEFAULT false NOT NULL,
	"condition" text DEFAULT 'NM' NOT NULL,
	"sale_price" double precision,
	"acquisition_cost" double precision,
	"currency" text NOT NULL,
	"collection_name" text,
	"sold_by_user_id" text,
	"sold_at" timestamp DEFAULT now() NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_sales_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "card_sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "device_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"device_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_alerts_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "device_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fulfilment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"source" text DEFAULT 'generic' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text,
	"closed_by_user_id" text,
	"closed_at" timestamp,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fulfilment_orders_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "fulfilment_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "intake_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"collection_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_contact" text,
	"notes" text,
	"status" text DEFAULT 'open' NOT NULL,
	"payout_method" text,
	"market_total" double precision,
	"cash_offer" double precision,
	"credit_offer" double precision,
	"paid_total" double precision,
	"currency" text,
	"card_count" integer,
	"created_by_user_id" text,
	"closed_by_user_id" text,
	"accepted_at" timestamp,
	"closed_at" timestamp,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intake_lots_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "intake_lots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"action" text NOT NULL,
	"user_id" text,
	"summary" text,
	"details" jsonb,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_activity_log_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "org_activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_inventory_snapshots" (
	"org_id" text NOT NULL,
	"day" date NOT NULL,
	"card_count" integer DEFAULT 0 NOT NULL,
	"market_value" double precision DEFAULT 0 NOT NULL,
	"cost_basis" double precision DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_inventory_snapshots_org_id_day_pk" PRIMARY KEY("org_id","day")
);
--> statement-breakpoint
ALTER TABLE "org_inventory_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "intake_lot_id" integer;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "acquisition_cost" double precision;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "acquisition_currency" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "acquired_at" timestamp;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cards_sorted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cards_at_last_service" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "maintenance_interval_cards" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_serviced_at" timestamp;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "maintenance_alert_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "buylist_config" jsonb;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "business_permissions" jsonb;--> statement-breakpoint
ALTER TABLE "scan_stats" ADD COLUMN "scanned_by_user_id" text;--> statement-breakpoint
ALTER TABLE "accuracy_checks" ADD CONSTRAINT "accuracy_checks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accuracy_checks" ADD CONSTRAINT "accuracy_checks_intake_lot_id_intake_lots_id_fk" FOREIGN KEY ("intake_lot_id") REFERENCES "public"."intake_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sales" ADD CONSTRAINT "card_sales_order_id_fulfilment_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."fulfilment_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_alerts" ADD CONSTRAINT "device_alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_lots" ADD CONSTRAINT "intake_lots_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accuracy_checks_org_collection_idx" ON "accuracy_checks" USING btree ("org_id","collection_id");--> statement-breakpoint
CREATE INDEX "card_sales_org_sold_idx" ON "card_sales" USING btree ("org_id","sold_at");--> statement-breakpoint
CREATE INDEX "device_alerts_org_created_idx" ON "device_alerts" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "fulfilment_orders_org_idx" ON "fulfilment_orders" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "intake_lots_org_idx" ON "intake_lots" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_lots_open_collection_idx" ON "intake_lots" USING btree ("collection_id") WHERE "intake_lots"."status" = 'open' AND "intake_lots"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "org_activity_log_org_created_idx" ON "org_activity_log" USING btree ("org_id","created_at");--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_intake_lot_id_intake_lots_id_fk" FOREIGN KEY ("intake_lot_id") REFERENCES "public"."intake_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_cards_intake_lot_idx" ON "collection_cards" USING btree ("intake_lot_id");--> statement-breakpoint
CREATE INDEX "scan_stats_org_user_scanned_idx" ON "scan_stats" USING btree ("org_id","scanned_by_user_id","scanned_at");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "accuracy_checks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("accuracy_checks"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("accuracy_checks"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "accuracy_checks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("accuracy_checks"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("accuracy_checks"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "accuracy_checks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("accuracy_checks"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("accuracy_checks"."org_id")) WITH CHECK (("accuracy_checks"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("accuracy_checks"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "accuracy_checks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("accuracy_checks"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("accuracy_checks"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_sales" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("card_sales"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_sales"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_sales" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("card_sales"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_sales"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_sales" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("card_sales"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_sales"."org_id")) WITH CHECK (("card_sales"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_sales"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_sales" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("card_sales"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_sales"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "device_alerts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("device_alerts"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("device_alerts"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "device_alerts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "device_alerts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "device_alerts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "fulfilment_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("fulfilment_orders"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("fulfilment_orders"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "fulfilment_orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("fulfilment_orders"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("fulfilment_orders"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "fulfilment_orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("fulfilment_orders"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("fulfilment_orders"."org_id")) WITH CHECK (("fulfilment_orders"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("fulfilment_orders"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "fulfilment_orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("fulfilment_orders"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("fulfilment_orders"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "intake_lots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("intake_lots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("intake_lots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "intake_lots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("intake_lots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("intake_lots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "intake_lots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("intake_lots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("intake_lots"."org_id")) WITH CHECK (("intake_lots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("intake_lots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "intake_lots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("intake_lots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("intake_lots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_activity_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_activity_log"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_activity_log"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_activity_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("org_activity_log"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_activity_log"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_activity_log" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("org_activity_log"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_activity_log"."org_id")) WITH CHECK (("org_activity_log"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_activity_log"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_activity_log" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("org_activity_log"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_activity_log"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_inventory_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_inventory_snapshots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_inventory_snapshots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_inventory_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_inventory_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_inventory_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);