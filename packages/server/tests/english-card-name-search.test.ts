import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { matchesEnglishCardNameSql } from "../src/lib/english-card-name-search";

const dialect = new PgDialect();
const collectionCardColumns = {
  gameKey: sql`g.key`,
  lang: sql`cc.card_lang`,
  setCode: sql`cc.card_set`,
  collectorNumber: sql`cc.card_collector_number`,
};

test("searches shorter than three characters skip the English name lookup", () => {
  assert.equal(matchesEnglishCardNameSql(collectionCardColumns, "  bo  "), undefined);
});

test("non-English cards match the English printing with the same game, set and collector number", () => {
  const condition = matchesEnglishCardNameSql(collectionCardColumns, " Bolt ");
  assert.ok(condition);
  const query = dialect.sqlToQuery(condition);
  assert.match(query.sql, /cc\.card_lang <> \$1/);
  assert.match(query.sql, /\(g\.key::text, cc\.card_set, lower\(cc\.card_collector_number\)\) IN \(/);
  assert.match(query.sql, /english_card\.name ILIKE \$3/);
  assert.deepEqual(query.params, ["en", "en", "%Bolt%"]);
});

test("LIKE wildcards in the search are matched literally", () => {
  const condition = matchesEnglishCardNameSql(collectionCardColumns, "50%_off");
  assert.ok(condition);
  assert.equal(dialect.sqlToQuery(condition).params.at(-1), "%50\\%\\_off%");
});
