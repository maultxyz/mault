import { ActivityType, type Client } from "discord.js";
import { getGames } from "./api";
import {
  PRESENCE_CYCLE_MS,
  PRESENCE_FALLBACK_STATUS,
  PRESENCE_REFRESH_MS,
  PRESENCE_RETRY_MS,
} from "./lib/constants";

export function startPresenceCycle(client: Client<true>) {
  let games: string[] = [];
  let index = 0;

  const refreshGames = async () => {
    try {
      const result = await getGames();
      if (result.success && result.data?.length) {
        games = result.data.map((g) => g.name);
        index = 0;
      }
    } catch (err) {
      if (games.length) {
        console.error("[bot] Failed to refresh games list for presence:", err);
        return;
      }
      console.warn(`[bot] Server not reachable yet, retrying games list in ${PRESENCE_RETRY_MS / 1000}s`);
      setTimeout(() => void refreshGames(), PRESENCE_RETRY_MS);
    }
  };

  const tick = () => {
    const status = games.length ? games[index % games.length] : PRESENCE_FALLBACK_STATUS;
    client.user.setActivity(status, { type: ActivityType.Watching });
    index++;
  };

  void refreshGames().then(tick);
  setInterval(tick, PRESENCE_CYCLE_MS);
  setInterval(refreshGames, PRESENCE_REFRESH_MS);
}
