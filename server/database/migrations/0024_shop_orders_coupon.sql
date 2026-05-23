ALTER TABLE "shop_orders" ADD COLUMN "coupon_id" uuid;
--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "coupon_code" varchar(64);
--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "discount_amount" numeric(14, 4) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_orders"
ADD CONSTRAINT "shop_orders_coupon_id_coupons_id_fk"
FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shop_orders_coupon_id_idx" ON "shop_orders" USING btree ("coupon_id");
