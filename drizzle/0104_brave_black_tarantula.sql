CREATE POLICY "api-service-policy-update" ON "collection_cards" AS PERMISSIVE FOR UPDATE TO "api_service" USING ("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) WITH CHECK ("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
CREATE POLICY "api-service-policy-delete" ON "collection_cards" AS PERMISSIVE FOR DELETE TO "api_service" USING ("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
GRANT UPDATE ("location_id", "location_position") ON "collection_cards" TO api_service;--> statement-breakpoint
GRANT DELETE ON "collection_cards" TO api_service;
