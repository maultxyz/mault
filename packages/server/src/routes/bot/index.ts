import { Hono } from "hono";
import { requireBotSecret, type AppEnv } from "../../middleware/auth";
import { botLinkRoute } from "./link";
import { botListCollectionsRoute } from "./list-collections";
import { botStatsRoute } from "./stats";
import { botUnlinkRoute } from "./unlink";

const router = new Hono<AppEnv>();

router.use("*", requireBotSecret);

router.route("/", botLinkRoute);
router.route("/", botStatsRoute);
router.route("/", botListCollectionsRoute);
router.route("/", botUnlinkRoute);

export { router as botRouter };
