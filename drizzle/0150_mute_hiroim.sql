DROP INDEX "preset_workflow_steps_root_idx";--> statement-breakpoint
DROP INDEX "preset_workflow_steps_parent_bin_idx";--> statement-breakpoint
ALTER TABLE "preset_workflow_steps" DROP COLUMN "parent_step_guid";--> statement-breakpoint
ALTER TABLE "preset_workflow_steps" DROP COLUMN "parent_bin_number";--> statement-breakpoint
ALTER TABLE "preset_workflow_steps" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;