CREATE TABLE "tenant_homepage_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version_state" varchar(16) DEFAULT 'draft' NOT NULL,
	"module_key" varchar(64) NOT NULL,
	"module_type" varchar(32) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_homepage_modules" ADD CONSTRAINT "tenant_homepage_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_homepage_modules" ADD CONSTRAINT "tenant_homepage_modules_version_state_check" CHECK ("tenant_homepage_modules"."version_state" IN ('draft', 'published'));
--> statement-breakpoint
ALTER TABLE "tenant_homepage_modules" ADD CONSTRAINT "tenant_homepage_modules_module_type_check" CHECK ("tenant_homepage_modules"."module_type" IN ('nav', 'banner', 'category', 'products', 'footer'));
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_homepage_modules_tenant_state_key_uidx" ON "tenant_homepage_modules" USING btree ("tenant_id","version_state","module_key");
--> statement-breakpoint
CREATE INDEX "tenant_homepage_modules_tenant_state_sort_idx" ON "tenant_homepage_modules" USING btree ("tenant_id","version_state","sort_order");
--> statement-breakpoint
CREATE INDEX "tenant_homepage_modules_tenant_state_type_idx" ON "tenant_homepage_modules" USING btree ("tenant_id","version_state","module_type");
