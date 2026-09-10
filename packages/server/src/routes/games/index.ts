import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addGameRoute } from "./add";
import { checkKeyRoute } from "./check-key";
import { gameCoverageRoute } from "./coverage";
import { deleteGameRoute } from "./delete";
import { editGameRoute } from "./edit";
import { gameLanguagesRoute } from "./languages";
import { listGamesRoute } from "./list";
import { sampleCardRoute } from "./sample-card";

const router = new Hono<AppEnv>()
  .route("/", listGamesRoute)
  .route("/", gameCoverageRoute)
  .route("/", sampleCardRoute)
  .route("/", checkKeyRoute)
  .route("/", gameLanguagesRoute)
  .route("/", addGameRoute)
  .route("/", editGameRoute)
  .route("/", deleteGameRoute);

export { router as gamesRouter };
