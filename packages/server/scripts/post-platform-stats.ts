import { pool } from "../src/db";
import { postPlatformStats } from "../src/lib/platform-stats";

postPlatformStats()
  .then((outcome) => {
    if (outcome === "not_configured") {
      console.log(
        "[post-platform-stats] Not configured: pick a server, channel and stats in Admin > Discord stats.",
      );
    } else if (outcome === "failed") {
      console.error("[post-platform-stats] The bot couldn't post the stats.");
      process.exitCode = 1;
    } else {
      console.log("[post-platform-stats] Posted.");
    }
  })
  .catch((err) => {
    console.error("[post-platform-stats] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
