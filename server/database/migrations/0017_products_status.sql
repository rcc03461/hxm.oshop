ALTER TABLE "products"
ADD COLUMN "status" varchar(32) DEFAULT 'active' NOT NULL;

CREATE INDEX "products_tenant_status_idx"
ON "products" USING btree ("tenant_id","status");
