import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  cardPrintingsSql,
  catalogPrintingIsListedSql,
  catalogReleaseDateSql,
  groupedCatalogSearchSql,
  newestPrintingFirstOrderSql,
  shownPrintingFirstOrderSql,
} from "../src/lib/card-search/catalog-printing-order";
import { pokemonAdapter } from "../src/lib/adapters/pokemon/search";
import { pokemonJapanAdapter } from "../src/lib/adapters/pokemon-japan/search";
import { scryfallAdapter } from "../src/lib/adapters/scryfall/search";
import { withTcgtracking } from "../src/lib/tcgtracking/adapter";
import type { CardSearchAdapter } from "../src/lib/interfaces/card-search";

const dialect = new PgDialect();
const render = (query: SQL) => dialect.sqlToQuery(query);

const datedAdapter: CardSearchAdapter = {
  defaultUrl: "",
  normalizeStored: () => null,
  releasedAtSql: sql`data->>'released_at'`,
  rarePrintingSql: sql`(data->>'promo') = 'true'`,
  releaseSequenceSql: sql`(data->>'product_id')::bigint`,
  excludedFromMatchingSql: sql`(data->>'digital') = 'true'`,
};

const undatedAdapter: CardSearchAdapter = {
  defaultUrl: "",
  normalizeStored: () => null,
};

test("release dates only keep values that start with an ISO date, cut to the day", () => {
  const rendered = render(catalogReleaseDateSql(datedAdapter));
  assert.match(rendered.sql, /CASE WHEN \(data->>'released_at'\) ~ \$1 THEN left\(\(data->>'released_at'\), 10\) END/);
  assert.deepEqual(rendered.params, ["^[0-9]{4}-[0-9]{2}-[0-9]{2}"]);
  assert.equal(render(catalogReleaseDateSql(undatedAdapter)).sql, "NULL::text");
});

test("newest printing order: release date, then regular before rare, then undated sequence, then collector number", () => {
  const terms = newestPrintingFirstOrderSql(datedAdapter).map((term) => render(term).sql);
  assert.match(terms[0], /^\(CASE WHEN .* END\) DESC NULLS LAST$/);
  assert.equal(terms[1], "coalesce(((data->>'promo') = 'true'), false) ASC");
  assert.match(terms[2], /^\(CASE WHEN \(CASE WHEN .* END\) IS NULL THEN \(\(data->>'product_id'\)::bigint\) END\) DESC NULLS LAST$/);
  assert.equal(terms[3], "set_code DESC");
  assert.match(terms[4], /^\(substring\(collector_number from \$1\)\)::int ASC NULLS LAST$/);
  assert.equal(terms[5], "collector_number ASC NULLS LAST");
  assert.equal(terms[6], "card_id ASC");
});

test("games without dates or rare printings still order deterministically", () => {
  const terms = newestPrintingFirstOrderSql(undatedAdapter).map((term) => render(term).sql);
  assert.deepEqual(terms.slice(0, 4), [
    "NULL::text DESC NULLS LAST",
    "coalesce((false), false) ASC",
    "NULL::bigint DESC NULLS LAST",
    "set_code DESC",
  ]);
  assert.equal(terms.at(-1), "card_id ASC");
});

test("printings excluded from matching are never listed", () => {
  assert.equal(render(catalogPrintingIsListedSql(datedAdapter)).sql, "NOT coalesce(((data->>'digital') = 'true'), false)");
  assert.equal(render(catalogPrintingIsListedSql(undatedAdapter)).sql, "true");
});

test("grouped search pages names, then picks one newest listed printing per name with its printing count", () => {
  const rendered = render(
    groupedCatalogSearchSql({
      adapter: datedAdapter,
      gameKey: "mtg",
      preferredLang: "en",
      searchFilter: sql`name_matches_query`,
      printingFilter: sql`printing_is_listed`,
      printingMatch: sql`printing_query_matches`,
      exactName: "Lightning Bolt",
      offset: 60,
      limit: 61,
    }),
  );
  assert.match(rendered.sql, /GROUP BY cards\.lang, cards\.name/);
  assert.match(rendered.sql, /OFFSET \$\d+\s+LIMIT \$\d+/);
  assert.match(rendered.sql, /CROSS JOIN LATERAL \([\s\S]*LIMIT 1\s*\) AS chosen/);
  assert.match(
    rendered.sql,
    /ORDER BY coalesce\(\(printing_query_matches\), false\) DESC, coalesce\(\([\s\S]*?\), false\) ASC, \(CASE WHEN \(data->>'released_at'\)/,
  );
  assert.match(rendered.sql, /AND printing_is_listed\s/);
  assert.match(rendered.sql, /count\(\*\)::int[\s\S]*NOT coalesce\(\(\(data->>'digital'\) = 'true'\), false\)/);
  assert.ok(rendered.params.includes(60));
  assert.ok(rendered.params.includes(61));
  assert.ok(rendered.params.includes("Lightning Bolt"));
});

test("printings query lists every listed printing of one name, newest first", () => {
  const rendered = render(
    cardPrintingsSql({
      adapter: datedAdapter,
      gameKey: "mtg",
      lang: "en",
      cardName: "Lightning Bolt",
      offset: 0,
      limit: 60,
    }),
  );
  assert.match(rendered.sql, /WHERE game_key = \$1 AND lang = \$2 AND name = \$3 AND data IS NOT NULL AND NOT coalesce/);
  assert.match(rendered.sql, /ORDER BY \(CASE WHEN \(data->>'released_at'\)/);
  assert.match(rendered.sql, /count\(\*\) OVER \(\)::int AS total_count/);
  assert.deepEqual(rendered.params.slice(0, 3), ["mtg", "en", "Lightning Bolt"]);
});

test("TCGTracking wrapper dates fallbacks from their set only when the source adapter is dated", () => {
  const magic = withTcgtracking("mtg", scryfallAdapter);
  const magicRelease = render(magic.releasedAtSql!).sql;
  assert.match(magicRelease, /data->'set'->>'published_on'/);
  assert.match(magicRelease, /data->>'released_at'/);
  const pokemon = withTcgtracking("pokemon", pokemonAdapter);
  assert.equal(pokemon.releasedAtSql, undefined);
  assert.match(render(pokemon.releaseSequenceSql!).sql, /tcgtrackingProductId/);
});

test("Japanese Pokémon dates printings from the TCGplayer set publish date", () => {
  assert.match(render(pokemonJapanAdapter.releasedAtSql!).sql, /data->'set'->>'published_on'/);
});

test("search shows a regular printing before a newer promo or list reprint", () => {
  const shownTerms = shownPrintingFirstOrderSql(datedAdapter).map((term) => render(term).sql);
  const newestTerms = newestPrintingFirstOrderSql(datedAdapter).map((term) => render(term).sql);
  assert.match(shownTerms[0], /promo/);
  assert.match(shownTerms[0], /ASC$/);
  assert.deepEqual(shownTerms.slice(1), newestTerms);
});
