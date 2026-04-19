ALTER TABLE "shop_orders"
ADD COLUMN "customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "shop_orders"
ADD CONSTRAINT "shop_orders_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shop_orders_tenant_customer_created_idx"
ON "shop_orders" USING btree ("tenant_id","customer_id","created_at");
