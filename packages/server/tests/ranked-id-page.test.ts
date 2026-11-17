import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampRequestedPage,
  rankedIdPageFromWindowedRows,
} from "../src/lib/ranked-id-page";

test("ranked id page: rows on the requested page carry the window total", () => {
  assert.deepEqual(
    rankedIdPageFromWindowedRows(
      [
        { id: "11", total: "42" },
        { id: 12, total: 42 },
      ],
      3,
    ),
    { rowIds: [11, 12], total: 42, page: 3 },
  );
});

test("ranked id page: an empty first page means there are no rows", () => {
  assert.deepEqual(rankedIdPageFromWindowedRows([], 1), {
    rowIds: [],
    total: 0,
    page: 1,
  });
});

test("ranked id page: an empty later page needs a count to clamp the page", () => {
  assert.equal(rankedIdPageFromWindowedRows([], 4), null);
});

test("ranked id page: clamping keeps the last page and never goes below one", () => {
  assert.equal(clampRequestedPage(9, 41, 20), 3);
  assert.equal(clampRequestedPage(2, 41, 20), 2);
  assert.equal(clampRequestedPage(5, 0, 20), 1);
});
