ALTER TABLE "tenant_homepage_modules" DROP CONSTRAINT IF EXISTS "tenant_homepage_modules_module_type_check";
--> statement-breakpoint
ALTER TABLE "tenant_homepage_modules"
ADD CONSTRAINT "tenant_homepage_modules_module_type_check"
CHECK ("tenant_homepage_modules"."module_type" IN ('nav', 'banner', 'image_slider', 'category', 'products', 'footer'));
