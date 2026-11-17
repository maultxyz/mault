import { Hono } from "hono";
import { requireBotSecret, type AppEnv } from "../../middleware/auth";
import { botCalibrationRoute } from "./calibration";
import { botLeaderboardRoute } from "./leaderboard";
import { botLinkRoute } from "./link";
import { botLinkAccountRoute } from "./link-account";
import { botListCollectionsRoute } from "./list-collections";
import { botRulePresetsRoute } from "./rule-presets";
import { botShowoffRoute } from "./showoff";
import { botStatsRoute } from "./stats";
import { botUnlinkRoute } from "./unlink";

const router = new Hono<AppEnv>();

router.use("*", requireBotSecret);

router.route("/", botLinkRoute);
router.route("/", botLinkAccountRoute);
router.route("/", botStatsRoute);
router.route("/", botShowoffRoute);
router.route("/", botLeaderboardRoute);
router.route("/", botListCollectionsRoute);
router.route("/", botCalibrationRoute);
router.route("/", botRulePresetsRoute);
router.route("/", botUnlinkRoute);

export { router as botRouter };
