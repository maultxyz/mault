import { max, sql } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerPrices } from "../db/schema";
import { fetchCardApi } from "./card-search/fetch";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { CARD_API_HEADERS } from "./constants/card-search";
import { TCGCSV_URL } from "./constants/urls";

// tcgcsv's usage guidelines: a named User-Agent (CARD_API_HEADERS), ~100ms
// between requests, and at most one full pull per daily build.
const REQUEST_DELAY_MS = 100;
const UPSERT_BATCH_SIZE = 1000;

interface TcgcsvResponse<T> {
  success: boolean;
  errors: string[];
  results: T[];
}

interface TcgcsvGroup {
  groupId: number;
  name: string;
}

interface TcgcsvPrice {
  productId: number;
  subTypeName: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
}

export interface PriceSyncResult {
  skipped: boolean;
  prices: number;
  failedGroups: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tcgcsvGet(path: string): Promise<Response> {
  const res = await fetchCardApi(`${TCGCSV_URL}${path}`, {
    headers: CARD_API_HEADERS,
  });
  await sleep(REQUEST_DELAY_MS);
  if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
  return res;
}

async function tcgcsvResults<T>(path: string): Promise<T[]> {
  const json = (await (await tcgcsvGet(path)).json()) as TcgcsvResponse<T>;
  if (!json.success) {
    throw new Error(`GET ${path} failed: ${json.errors.join("; ")}`);
  }
  return json.results;
}

async function upsertPrices(
  categoryId: number,
  prices: TcgcsvPrice[],
): Promise<void> {
  for (let i = 0; i < prices.length; i += UPSERT_BATCH_SIZE) {
    const batch = prices.slice(i, i + UPSERT_BATCH_SIZE);
    await db
      .insert(tcgplayerPrices)
      .values(
        batch.map((p) => ({
          productId: p.productId,
          subType: p.subTypeName,
          categoryId,
          lowPrice: p.lowPrice,
          midPrice: p.midPrice,
          highPrice: p.highPrice,
          marketPrice: p.marketPrice,
          directLowPrice: p.directLowPrice,
        })),
      )
      .onConflictDoUpdate({
        target: [tcgplayerPrices.productId, tcgplayerPrices.subType],
        set: {
          categoryId: sql`excluded.category_id`,
          lowPrice: sql`excluded.low_price`,
          midPrice: sql`excluded.mid_price`,
          highPrice: sql`excluded.high_price`,
          marketPrice: sql`excluded.market_price`,
          directLowPrice: sql`excluded.direct_low_price`,
          updatedAt: sql`now()`,
        },
      });
  }
}

// Pulls every group's prices for each game with a TCGplayer mapping
// (CardSearchAdapter.tcgplayer). Skipped when tcgcsv hasn't published a new
// build since the last pull, unless `force` is set. A failed group is logged
// and counted rather than aborting the rest of the run.
export async function syncTcgplayerPrices({
  force = false,
  log,
}: {
  force?: boolean;
  log: (msg: string) => void;
}): Promise<PriceSyncResult> {
  const lastUpdated = new Date(
    (await (await tcgcsvGet("/last-updated.txt")).text()).trim(),
  );
  const [{ lastSynced }] = await db
    .select({ lastSynced: max(tcgplayerPrices.updatedAt) })
    .from(tcgplayerPrices);

  if (!force && lastSynced && lastSynced >= lastUpdated) {
    log(
      `tcgcsv build ${lastUpdated.toISOString()} already pulled at ${lastSynced.toISOString()}; nothing to do.`,
    );
    return { skipped: true, prices: 0, failedGroups: 0 };
  }

  const categoryIds = [
    ...new Set(
      Object.values(ADAPTERS_BY_GAME_KEY).flatMap((adapter) =>
        adapter.tcgplayer ? [adapter.tcgplayer.categoryId] : [],
      ),
    ),
  ];
  log(
    `Pulling tcgcsv build ${lastUpdated.toISOString()} for categories ${categoryIds.join(", ")}...`,
  );

  let total = 0;
  let failedGroups = 0;
  for (const categoryId of categoryIds) {
    const groups = await tcgcsvResults<TcgcsvGroup>(
      `/tcgplayer/${categoryId}/groups`,
    );

    let categoryTotal = 0;
    for (const group of groups) {
      try {
        const prices = await tcgcsvResults<TcgcsvPrice>(
          `/tcgplayer/${categoryId}/${group.groupId}/prices`,
        );
        await upsertPrices(categoryId, prices);
        categoryTotal += prices.length;
      } catch (err) {
        failedGroups++;
        log(`Category ${categoryId}, group ${group.name}: ${String(err)}`);
      }
    }

    total += categoryTotal;
    log(
      `Category ${categoryId}: ${categoryTotal} prices across ${groups.length} groups.`,
    );
  }

  log(`Done. ${total} prices synced, ${failedGroups} groups failed.`);
  return { skipped: false, prices: total, failedGroups };
}
