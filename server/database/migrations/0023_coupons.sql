CREATE TABLE "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(64) NOT NULL,
  "description" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "min_order_amount" numeric(14, 4),
  "discount_type" varchar(16) NOT NULL,
  "discount_value" numeric(14, 4) NOT NULL,
  "status" varchar(32) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons"
ADD CONSTRAINT "coupons_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_tenant_code_uidx" ON "coupons" USING btree ("tenant_id","code");
--> statement-breakpoint
CREATE INDEX "coupons_tenant_status_idx" ON "coupons" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "coupons_tenant_period_idx" ON "coupons" USING btree ("tenant_id","starts_at","ends_at");
--> statement-breakpoint
CREATE TABLE "coupon_products" (
  "coupon_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupon_products"
ADD CONSTRAINT "coupon_products_coupon_id_coupons_id_fk"
FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coupon_products"
ADD CONSTRAINT "coupon_products_product_id_products_id_fk"
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_products_coupon_product_uidx" ON "coupon_products" USING btree ("coupon_id","product_id");
--> statement-breakpoint
CREATE INDEX "coupon_products_product_id_idx" ON "coupon_products" USING btree ("product_id");
