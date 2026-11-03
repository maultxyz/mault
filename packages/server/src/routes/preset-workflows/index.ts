import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { runPresetWorkflowRoute } from "./run";
import { presetWorkflowStepsRoute } from "./steps";
import { presetWorkflowsCrudRoute } from "./workflows";

const router = new Hono<AppEnv>()
  .route("/", presetWorkflowsCrudRoute)
  .route("/", presetWorkflowStepsRoute)
  .route("/", runPresetWorkflowRoute);

export { router as presetWorkflowsRouter };
