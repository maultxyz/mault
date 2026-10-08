import { and, asc, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cardImageVectors } from "../src/db/schema";
import { storedCollectorNumber } from "../src/lib/card-search/collector-number";
import { COLLECTOR_NUMBER_BACKFILL_BATCH_SIZE } from "../src/lib/constants/card-search";

async function main() {
  let lastId = 0;
  let updated = 0;
  let missing = 0;

  while (true) {
    const rows = await db
      .select({
        id: cardImageVectors.id,
        cardId: cardImageVectors.cardId,
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
        data: cardImageVectors.data,
      })
      .from(cardImageVectors)
      .where(
        and(
          gt(cardImageVectors.id, lastId),
          isNull(cardImageVectors.collectorNumber),
          isNotNull(cardImageVectors.data),
        ),
      )
      .orderBy(asc(cardImageVectors.id))
      .limit(COLLECTOR_NUMBER_BACKFILL_BATCH_SIZE);
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    const values = rows.flatMap((row) => {
      const collectorNumber = storedCollectorNumber(
        row.gameKey,
        row.lang,
        row.cardId,
        row.data,
      );
      if (!collectorNumber) {
        missing++;
        return [];
      }
      return [{ id: row.id, collector_number: collectorNumber }];
    });
    if (values.length > 0) {
      const result = await db.execute(sql`
        UPDATE cards AS c
        SET collector_number = x.collector_number
        FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb)
          AS x(id integer, collector_number text)
        WHERE c.id = x.id
      `);
      updated += result.rowCount ?? 0;
    }
    console.log(`Backfilled ${updated} card(s) so far (up to id ${lastId}).`);
  }

  console.log(
    `Done: ${updated} card(s) updated, ${missing} without a collector number.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
