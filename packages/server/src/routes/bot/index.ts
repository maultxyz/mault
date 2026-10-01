import { Hono } from "hono";
import { requireBotSecret, type AppEnv } from "../../middleware/auth";
import { botLinkRoute } from "./link";
import { botListCollectionsRoute } from "./list-collections";
import { botSetChannelRoute } from "./set-channel";
import { botStatsRoute } from "./stats";
import { botStatusRoute } from "./status";
import { botUnlinkRoute } from "./unlink";

const router = new Hono<AppEnv>();

router.use("*", requireBotSecret);

router.route("/", botLinkRoute);
router.route("/", botSetChannelRoute);
router.route("/", botStatsRoute);
router.route("/", botStatusRoute);
router.route("/", botListCollectionsRoute);
router.route("/", botUnlinkRoute);

export { router as botRouter };
