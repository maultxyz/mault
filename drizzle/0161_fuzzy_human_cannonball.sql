CREATE TABLE "api_key_usage_daily" (
	"api_key_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"day" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"rate_limited_count" integer DEFAULT 0 NOT NULL,
	"last_request_at" timestamp NOT NULL,
	CONSTRAINT "api_key_usage_daily_api_key_id_endpoint_day_pk" PRIMARY KEY("api_key_id","endpoint","day")
);
--> statement-breakpoint
CREATE TABLE "public_route_usage_daily" (
	"endpoint" text NOT NULL,
	"day" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"rate_limited_count" integer DEFAULT 0 NOT NULL,
	"last_request_at" timestamp NOT NULL,
	CONSTRAINT "public_route_usage_daily_endpoint_day_pk" PRIMARY KEY("endpoint","day")
);
--> statement-breakpoint
ALTER TABLE "api_key_usage_daily" ADD CONSTRAINT "api_key_usage_daily_api_key_id_org_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."org_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_usage_daily_day_idx" ON "api_key_usage_daily" USING btree ("day");