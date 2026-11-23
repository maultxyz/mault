import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ORG_PRICING, EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  cardFilterSql,
  isUnfilteredCardsQuery,
  parseCardsQuery,
} from "../src/routes/collections/cards-query";

const dialect = new PgDialect();

test("filters from clients that predate condition, language, finish and price get the defaults", () => {
  const query = parseCardsQuery({
    filters: JSON.stringify({ colors: ["U"], rarities: [], sets: [] }),
  });
  assert.deepEqual(query.filters.conditions, []);
  assert.deepEqual(query.filters.languages, []);
  assert.equal(query.filters.finish, "all");
  assert.equal(query.filters.minPrice, null);
  assert.equal(query.filters.maxPrice, null);
});

test("the default finish does not count as a filter", () => {
  assert.equal(
    isUnfilteredCardsQuery({ search: "", sort: null, grouped: false, filters: EMPTY_CARD_FILTERS }),
    true,
  );
  assert.equal(
    isUnfilteredCardsQuery({
      search: "",
      sort: null,
      grouped: false,
      filters: { ...EMPTY_CARD_FILTERS, finish: "foil" },
    }),
    false,
  );
});

test("condition, language, finish and price filters become SQL conditions", () => {
  const query = parseCardsQuery({
    filters: JSON.stringify({
      ...EMPTY_CARD_FILTERS,
      conditions: ["NM", "LP"],
      languages: ["ja"],
      finish: "nonfoil",
      minPrice: 1.5,
      maxPrice: 20,
    }),
  });
  const rendered = dialect.sqlToQuery(cardFilterSql(query, undefined, DEFAULT_ORG_PRICING));
  assert.match(rendered.sql, /cc\.condition = ANY/);
  assert.match(rendered.sql, /COALESCE\(cc\.language, cc\.card_lang/);
  assert.match(rendered.sql, /NOT cc\.is_foil/);
  assert.match(rendered.sql, />= \$\d+::float8/);
  assert.match(rendered.sql, /<= \$\d+::float8/);
  assert.ok(rendered.params.includes(1.5));
  assert.ok(rendered.params.includes(20));
});

test("a price filter without the org's pricing fails instead of being ignored", () => {
  const query = parseCardsQuery({
    filters: JSON.stringify({ ...EMPTY_CARD_FILTERS, minPrice: 2 }),
  });
  assert.throws(() => cardFilterSql(query));
});
