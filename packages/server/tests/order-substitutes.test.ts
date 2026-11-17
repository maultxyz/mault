import assert from "node:assert/strict";
import { test } from "node:test";
import {
  orderSubstituteCost,
  orderSubstituteDifferences,
  type OrderLineInput,
  type OrderSubstituteCandidate,
} from "@magic-vault/shared";

const line: OrderLineInput = {
  name: "Brainstorm",
  setCode: "ICE",
  collectorNumber: "61",
  condition: "NM",
  isFoil: false,
  quantity: 1,
};

const candidate = (overrides: Partial<OrderSubstituteCandidate>): OrderSubstituteCandidate => ({
  setCode: "ice",
  setName: "Ice Age",
  collectorNumber: "61",
  condition: "NM",
  isFoil: false,
  ...overrides,
});

test("an exact copy has no differences", () => {
  assert.deepEqual(orderSubstituteDifferences(line, candidate({})), []);
  assert.equal(orderSubstituteCost(line, candidate({})), 0);
});

test("reports printing, condition and finish differences", () => {
  assert.deepEqual(
    orderSubstituteDifferences(line, candidate({ setCode: "FCA", condition: "LP", isFoil: true })),
    ["printing", "condition", "finish"],
  );
});

test("ranks a one-grade condition swap ahead of another printing or finish", () => {
  const lightlyPlayed = orderSubstituteCost(line, candidate({ condition: "LP" }));
  const otherPrinting = orderSubstituteCost(line, candidate({ setCode: "FCA" }));
  const foil = orderSubstituteCost(line, candidate({ isFoil: true }));
  assert.ok(lightlyPlayed < foil);
  assert.ok(foil < otherPrinting);
});

test("prefers a better condition over an equally distant worse one", () => {
  const playedLine: OrderLineInput = { ...line, condition: "LP" };
  assert.ok(
    orderSubstituteCost(playedLine, candidate({ condition: "NM" })) <
      orderSubstituteCost(playedLine, candidate({ condition: "MP" })),
  );
});

test("ignores attributes the line leaves open", () => {
  const openLine: OrderLineInput = { name: "Brainstorm", quantity: 1 };
  assert.deepEqual(
    orderSubstituteDifferences(openLine, candidate({ setCode: "FCA", condition: "HP", isFoil: true })),
    [],
  );
});
