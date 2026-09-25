CREATE TABLE "tcgplayer_prices" (
	"product_id" integer NOT NULL,
	"sub_type" text NOT NULL,
	"category_id" integer NOT NULL,
	"low_price" double precision,
	"mid_price" double precision,
	"high_price" double precision,
	"market_price" double precision,
	"direct_low_price" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tcgplayer_prices_product_id_sub_type_pk" PRIMARY KEY("product_id","sub_type")
);
