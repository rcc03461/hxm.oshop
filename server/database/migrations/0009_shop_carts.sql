CREATE TABLE "shop_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid,
	"session_key" varchar(128),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_carts" ADD CONSTRAINT "shop_carts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_carts" ADD CONSTRAINT "shop_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shop_carts_tenant_customer_status_idx" ON "shop_carts" USING btree ("tenant_id","customer_id","status");
--> statement-breakpoint
CREATE INDEX "shop_carts_tenant_session_status_idx" ON "shop_carts" USING btree ("tenant_id","session_key","status");
--> statement-breakpoint
CREATE TABLE "shop_cart_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_variant_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"title_snapshot" varchar(255) NOT NULL,
	"product_slug_snapshot" varchar(255) NOT NULL,
	"unit_price_snapshot" numeric(14, 4) NOT NULL,
	"option_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_cart_lines" ADD CONSTRAINT "shop_cart_lines_cart_id_shop_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."shop_carts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_cart_lines" ADD CONSTRAINT "shop_cart_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_cart_lines" ADD CONSTRAINT "shop_cart_lines_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "shop_cart_lines_cart_product_variant_uidx" ON "shop_cart_lines" USING btree ("cart_id","product_id","product_variant_id");
--> statement-breakpoint
CREATE INDEX "shop_cart_lines_cart_id_idx" ON "shop_cart_lines" USING btree ("cart_id");
