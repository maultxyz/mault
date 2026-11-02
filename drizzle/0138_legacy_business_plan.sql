UPDATE "org_billing" SET "plan" = 'legacyBusiness', "updated_at" = now() WHERE "plan" = 'business';
--> statement-breakpoint
INSERT INTO "plan_settings" ("plan", "features", "limits", "updated_at")
SELECT 'legacyBusiness', "features", "limits", now() FROM "plan_settings" WHERE "plan" = 'business'
ON CONFLICT ("plan") DO NOTHING;
