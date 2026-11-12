import { monitorEventLoopDelay } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { db, pool } from "./db";
import { cardMatchSegments } from "./lib/card-match-index";
import { matchScopeForGame } from "./lib/card-search/match-games";

async function main() {
  const lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();
  let worstStall = 0;
  let last = performance.now();
  const ticker = setInterval(() => {
    const now = performance.now();
    worstStall = Math.max(worstStall, now - last - 100);
    last = now;
  }, 100);
  let connectionFailures = 0;
  let connectionChecks = 0;
  const prober = setInterval(() => {
    connectionChecks++;
    const started = performance.now();
    db.execute(sql`select 1`).then(
      () => {},
      (err) => { connectionFailures++; console.log(`probe failed after ${Math.round(performance.now() - started)} ms: ${err.cause?.message ?? err.message}`); },
    );
  }, 500);
  const games = ["mtg", "pokemon", "pokemonjp", "fab", "gundam", "lorcana", "onepiece", "riftbound", "sorcery", "yugioh", "cyberpunk", "grandarchive"];
  const started = performance.now();
  for (const gameKey of games) {
    await cardMatchSegments(matchScopeForGame(gameKey));
    console.log(`after ${gameKey}: worst stall so far ${Math.round(worstStall)} ms, heap ${Math.round(process.memoryUsage().heapUsed / 1e6)} MB, rss ${Math.round(process.memoryUsage().rss / 1e6)} MB, pool total ${pool.totalCount} waiting ${pool.waitingCount}`);
  }
  clearInterval(ticker);
  clearInterval(prober);
  console.log(`loaded all in ${Math.round((performance.now() - started) / 1000)} s; event loop p99 ${Math.round(lag.percentile(99) / 1e6)} ms, max ${Math.round(lag.max / 1e6)} ms; probes ${connectionChecks}, failed ${connectionFailures}`);
}
main().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
