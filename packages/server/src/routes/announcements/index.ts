import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { activeAnnouncementsRoute } from "./active";
import { addAnnouncementRoute } from "./add";
import { deleteAnnouncementRoute } from "./delete";
import { editAnnouncementRoute } from "./edit";
import { listAnnouncementsRoute } from "./list";
import { publicAnnouncementsRoute } from "./public";

const router = new Hono<AppEnv>()
  .route("/", publicAnnouncementsRoute)
  .route("/", activeAnnouncementsRoute)
  .route("/", listAnnouncementsRoute)
  .route("/", addAnnouncementRoute)
  .route("/", editAnnouncementRoute)
  .route("/", deleteAnnouncementRoute);

export { router as announcementsRouter };
