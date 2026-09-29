ALTER POLICY "crud-authenticated-policy-insert" ON "org_billing" TO authenticated WITH CHECK (false);--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "org_billing" TO authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "org_billing" TO authenticated USING (false);