import assert from "node:assert/strict";
import { test } from "node:test";
import { containsLikePattern, escapeLikePattern } from "../src/lib/sql-like";

test("LIKE wildcards and the escape character match literally", () => {
  assert.equal(escapeLikePattern("50%_off\\"), "50\\%\\_off\\\\");
  assert.equal(escapeLikePattern("lightning bolt"), "lightning bolt");
});

test("contains patterns wrap the escaped text in wildcards", () => {
  assert.equal(containsLikePattern("a_b"), "%a\\_b%");
});
