CREATE TABLE "customer_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "customer_id" uuid,
  "name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(32),
  "message" text NOT NULL,
  "remark" text,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_messages"
ADD CONSTRAINT "customer_messages_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_messages"
ADD CONSTRAINT "customer_messages_customer_id_customers_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "customer_messages_tenant_status_created_idx"
ON "customer_messages" USING btree ("tenant_id","status","created_at");
--> statement-breakpoint
CREATE INDEX "customer_messages_tenant_customer_idx"
ON "customer_messages" USING btree ("tenant_id","customer_id");
