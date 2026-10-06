import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { activeAnnouncementsRoute } from "./active";
import { addAnnouncementRoute } from "./add";
import { deleteAnnouncementRoute } from "./delete";
import { deployAnnouncementRoute } from "./deploy";
import { editAnnouncementRoute } from "./edit";
import { listAnnouncementsRoute } from "./list";
import { publicAnnouncementsRoute } from "./public";

const router = new Hono<AppEnv>()
  .route("/", publicAnnouncementsRoute)
  .route("/", activeAnnouncementsRoute)
  .route("/", deployAnnouncementRoute)
  .route("/", listAnnouncementsRoute)
  .route("/", addAnnouncementRoute)
  .route("/", editAnnouncementRoute)
  .route("/", deleteAnnouncementRoute);

export { router as announcementsRouter };
