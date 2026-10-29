import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addOrderLines,
  ORDER_LINE_QUANTITY_MAX,
  orderLineIdentity,
} from "@magic-vault/shared";

test("order lines: adding a card already on the pick raises its quantity", () => {
  const lines = addOrderLines(
    [{ name: "Sol Ring", quantity: 1 }],
    [
      { name: "sol ring", quantity: 2 },
      { name: "Counterspell", quantity: 1 },
    ],
  );
  assert.deepEqual(lines, [
    { name: "Sol Ring", quantity: 3 },
    { name: "Counterspell", quantity: 1 },
  ]);
});

test("order lines: a different printing or condition stays its own line", () => {
  const lines = addOrderLines(
    [{ name: "Sol Ring", setCode: "C21", quantity: 1 }],
    [
      { name: "Sol Ring", quantity: 1 },
      { name: "Sol Ring", setCode: "C21", condition: "LP", quantity: 1 },
    ],
  );
  assert.equal(lines.length, 3);
});

test("order lines: merged quantities stop at the line maximum", () => {
  const [line] = addOrderLines(
    [{ name: "Island", quantity: ORDER_LINE_QUANTITY_MAX }],
    [{ name: "Island", quantity: 5 }],
  );
  assert.equal(line.quantity, ORDER_LINE_QUANTITY_MAX);
});

test("order lines: identity ignores letter case but not the set", () => {
  assert.equal(
    orderLineIdentity({ name: "Sol Ring", setCode: "c21", quantity: 1 }),
    orderLineIdentity({ name: "sol ring", setCode: "C21", quantity: 4 }),
  );
  assert.notEqual(
    orderLineIdentity({ name: "Sol Ring", setCode: "C21", quantity: 1 }),
    orderLineIdentity({ name: "Sol Ring", setCode: "CMR", quantity: 1 }),
  );
});
