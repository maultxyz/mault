import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALPHABET_LETTERS,
  evaluateAlphabetBin,
  getAlphabetPass,
  getAlphabetPassCount,
  getAlphabetPassLabels,
  getAlphabetStepPile,
  getNextAlphabetStep,
  type AlphabetStep,
  type BinConfig,
  type SourceCard,
} from "@magic-vault/shared";

function alphabetBins(sortingBinCount: number): BinConfig[] {
  const sortingBins = Array.from({ length: sortingBinCount }, (_, index) => ({
    guid: `bin-${index + 1}`,
    binNumber: index + 1,
    rules: { id: `rules-${index + 1}`, combinator: "and" as const, conditions: [] },
  }));
  return [
    ...sortingBins,
    {
      guid: "catch-all",
      binNumber: sortingBinCount + 1,
      rules: { id: "rules-catch-all", combinator: "and", conditions: [] },
      isCatchAll: true,
    },
  ];
}

function card(name: string): SourceCard {
  return { name } as SourceCard;
}

function timesSorted(configs: BinConfig[], name: string): number {
  const catchAllBinNumber = configs.find((config) => config.isCatchAll)?.binNumber;
  let sortCount = 0;
  for (let pass = 0; pass < getAlphabetPassCount(configs); pass++) {
    const pile = getAlphabetStepPile(configs, { pass, prefix: "" });
    const firstLetter = name.charAt(0).toUpperCase();
    const isInPile =
      pile === null ||
      (pile.includes("-")
        ? firstLetter >= pile.split("-")[0] && firstLetter <= pile.split("-")[1]
        : firstLetter === pile);
    if (!isInPile) continue;
    sortCount++;
    const bin = evaluateAlphabetBin(card(name), configs, pass);
    assert.notEqual(bin?.binNumber, catchAllBinNumber, `${name} fell into the catch-all in pass ${pass}`);
  }
  return sortCount;
}

test("first pass splits the alphabet into one range per bin", () => {
  const configs = alphabetBins(9);
  assert.deepEqual(
    [...getAlphabetPassLabels(configs, 0).values()],
    ["A-C", "D-F", "G-I", "J-L", "M-O", "P-R", "S-U", "V-X", "Y-Z"],
  );
  assert.equal(getAlphabetPass(configs, 0)?.sortsOneLetterPerBin, false);
  assert.equal(evaluateAlphabetBin(card("Lightning Bolt"), configs, 0)?.binNumber, 4);
});

test("each range pile is then sorted one letter per bin", () => {
  const configs = alphabetBins(9);
  assert.equal(getAlphabetPassCount(configs), 10);
  assert.equal(getAlphabetStepPile(configs, { pass: 4, prefix: "" }), "J-L");
  assert.deepEqual([...getAlphabetPassLabels(configs, 4).values()], ["J", "K", "L"]);
  assert.equal(getAlphabetPass(configs, 4)?.sortsOneLetterPerBin, true);
  assert.equal(evaluateAlphabetBin(card("Lightning Bolt"), configs, 4)?.binNumber, 3);
  assert.equal(evaluateAlphabetBin(card("Mox Pearl"), configs, 4)?.isCatchAll, true);
});

test("every card is sorted exactly twice with 6 or more bins", () => {
  for (const sortingBinCount of [6, 9, 13]) {
    const configs = alphabetBins(sortingBinCount);
    for (const letter of ALPHABET_LETTERS) {
      assert.equal(timesSorted(configs, `${letter}name`), 2, `${letter} with ${sortingBinCount} bins`);
    }
  }
});

test("with fewer bins the biggest ranges take one more pass", () => {
  const configs = alphabetBins(5);
  const counts = ALPHABET_LETTERS.map((letter) => timesSorted(configs, `${letter}name`));
  assert.ok(counts.every((count) => count === 2 || count === 3));
  assert.equal(timesSorted(configs, "Aname"), 3);
});

test("one pass is enough when every letter has its own bin", () => {
  const configs = alphabetBins(26);
  assert.equal(getAlphabetPassCount(configs), 1);
  assert.equal(getAlphabetPass(configs, 0)?.sortsOneLetterPerBin, true);
});

test("alphabet sort needs two sorting bins", () => {
  assert.equal(getAlphabetPassCount(alphabetBins(1)), 0);
  assert.equal(evaluateAlphabetBin(card("Island"), alphabetBins(1), 0)?.isCatchAll, true);
});

test("deeper piles use the same ranges on the next letter", () => {
  const configs = alphabetBins(9);
  assert.equal(getAlphabetStepPile(configs, { pass: 0, prefix: "S" }), "S");
  assert.equal(evaluateAlphabetBin(card("Swords to Plowshares"), configs, 0, "S")?.binNumber, 8);
  assert.equal(getAlphabetStepPile(configs, { pass: 9, prefix: "S" }), "SY-SZ");
  const lastStepOfPile: AlphabetStep = { pass: 9, prefix: "S" };
  assert.deepEqual(getNextAlphabetStep(configs, lastStepOfPile), { pass: 0, prefix: "T" });
  assert.equal(getAlphabetStepPile(configs, { pass: 0, prefix: "" }), null);
});
