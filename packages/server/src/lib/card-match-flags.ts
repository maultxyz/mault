import { createHash } from "node:crypto";
import { setImmediate as yieldToEventLoop } from "node:timers/promises";
import { sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { backgroundLoadDb } from "../db";
import {
  CARD_MATCH_FLAGS_FILL_BATCH_SIZE,
  CARD_MATCH_FLAGS_FINGERPRINT_MAX,
} from "./constants/card-search";
import type { CardMatchFlagsSql } from "./interfaces/card-match-index";
import type { CardSearchAdapter } from "./interfaces/card-search";

const pgDialect = new PgDialect();
const fillsInProgress = new Map<string, Promise<void>>();
let fillQueue: Promise<void> = Promise.resolve();

function fingerprintOf(expressions: SQL[]): number {
  const rendered = expressions.map((expression) => pgDialect.sqlToQuery(expression));
  const digest = createHash("sha256").update(JSON.stringify(rendered)).digest();
  return digest.readUInt32BE(0) & CARD_MATCH_FLAGS_FINGERPRINT_MAX;
}

export function cardMatchFlagsSql(adapter: CardSearchAdapter | undefined): CardMatchFlagsSql {
  const rarePrinting = sql`coalesce(${adapter?.rarePrintingSql ?? sql`false`}, false)`;
  const promoPrinting = sql`coalesce(${adapter?.promoPrintingSql ?? sql`false`}, false)`;
  const printedLanguageCode = sql`(${adapter?.printedLanguageCodeSql ?? sql`NULL`})::boolean`;
  const printedSetTotal = sql`(${adapter?.printedSetTotalSql ?? sql`NULL`})::int`;
  const excludedFromMatching = sql`coalesce(${adapter?.excludedFromMatchingSql ?? sql`false`}, false)`;
  const fingerprint = fingerprintOf([
    rarePrinting,
    promoPrinting,
    printedLanguageCode,
    printedSetTotal,
    excludedFromMatching,
  ]);
  return {
    fingerprint,
    rarePrinting,
    promoPrinting,
    printedLanguageCode,
    printedSetTotal,
    excludedFromMatching,
    storedFlagsAreCurrent: sql`coalesce(match_flags_fingerprint = ${fingerprint} AND match_flags_source_updated_at = updated_at, false)`,
  };
}

export function storedOrComputedFlagSql(
  flags: CardMatchFlagsSql,
  storedColumn: string,
  computed: SQL,
): SQL {
  return sql`CASE WHEN ${flags.storedFlagsAreCurrent} THEN ${sql.identifier(storedColumn)} ELSE ${computed} END`;
}

export function cardMatchFlagsFillBatchSql(
  gameKey: string,
  lang: string,
  flags: CardMatchFlagsSql,
  afterCardId: string,
): SQL {
  return sql`
      WITH stale AS (
        SELECT id AS stale_id
        FROM cards
        WHERE game_key = ${gameKey} AND lang = ${lang} AND card_id > ${afterCardId}
          AND NOT ${flags.storedFlagsAreCurrent}
        ORDER BY card_id
        LIMIT ${CARD_MATCH_FLAGS_FILL_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      , filled AS (
        UPDATE cards SET
          is_rare_printing = ${flags.rarePrinting},
          is_promo_printing = ${flags.promoPrinting},
          printed_language_code = ${flags.printedLanguageCode},
          printed_set_total = ${flags.printedSetTotal},
          is_excluded_from_matching = ${flags.excludedFromMatching},
          match_flags_fingerprint = ${flags.fingerprint},
          match_flags_source_updated_at = updated_at
        FROM stale
        WHERE id = stale.stale_id
        RETURNING card_id
      )
      SELECT max(card_id) AS last_card_id, count(*)::int AS filled_count FROM filled
    `;
}

async function fillScope(gameKey: string, lang: string, flags: CardMatchFlagsSql): Promise<void> {
  const startedAt = Date.now();
  let afterCardId = "";
  let filledCount = 0;
  for (;;) {
    const result = await backgroundLoadDb.execute<{ last_card_id: string | null; filled_count: number }>(
      cardMatchFlagsFillBatchSql(gameKey, lang, flags, afterCardId),
    );
    const { last_card_id: lastCardId, filled_count: batchCount } = result.rows[0];
    filledCount += batchCount;
    if (batchCount < CARD_MATCH_FLAGS_FILL_BATCH_SIZE || !lastCardId) break;
    afterCardId = lastCardId;
    await yieldToEventLoop();
  }
  console.log(
    `[card-match-index] stored match flags for ${filledCount} ${gameKey}/${lang} cards in ${Date.now() - startedAt}ms`,
  );
}

export function fillCardMatchFlagsInBackground(
  gameKey: string,
  lang: string,
  flags: CardMatchFlagsSql,
): void {
  const key = `${gameKey}:${lang}`;
  if (fillsInProgress.has(key)) return;
  const fill = fillQueue
    .then(() => fillScope(gameKey, lang, flags))
    .catch((err: unknown) =>
      console.error(`[card-match-index] storing match flags for ${gameKey}/${lang} failed:`, err),
    )
    .finally(() => fillsInProgress.delete(key));
  fillsInProgress.set(key, fill);
  fillQueue = fill;
}
