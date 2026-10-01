import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { deleteSoundClipRoute } from "./clips-delete";
import { editSoundClipRoute } from "./clips-edit";
import { listSoundClipsRoute } from "./clips-list";
import { uploadSoundClipRoute } from "./clips-upload";
import { addSoundRuleRoute } from "./rules-add";
import { countSoundRulesRoute } from "./rules-count";
import { deleteSoundRuleRoute } from "./rules-delete";
import { editSoundRuleRoute } from "./rules-edit";
import { listSoundRulesRoute } from "./rules-list";
import { orderSoundRulesRoute } from "./rules-order";

const router = new Hono<AppEnv>()
  .route("/", listSoundClipsRoute)
  .route("/", uploadSoundClipRoute)
  .route("/", editSoundClipRoute)
  .route("/", deleteSoundClipRoute)
  .route("/", countSoundRulesRoute)
  .route("/", listSoundRulesRoute)
  .route("/", addSoundRuleRoute)
  .route("/", orderSoundRulesRoute)
  .route("/", editSoundRuleRoute)
  .route("/", deleteSoundRuleRoute);

export { router as soundsRouter };
