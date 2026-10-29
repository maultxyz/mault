import assert from "node:assert/strict";
import { test } from "node:test";
import { findRestorableName } from "../src/lib/restored-name";

const takenNames = (names: string[]) => async (candidate: string) =>
  names.includes(candidate);

test("restoring keeps the original name when it is free", async () => {
  assert.equal(await findRestorableName("Shelf A", 50, takenNames([])), "Shelf A");
});

test("restoring adds a restored suffix when the name is taken", async () => {
  assert.equal(
    await findRestorableName("Shelf A", 50, takenNames(["Shelf A"])),
    "Shelf A (restored)",
  );
  assert.equal(
    await findRestorableName(
      "Shelf A",
      50,
      takenNames(["Shelf A", "Shelf A (restored)"]),
    ),
    "Shelf A (restored 2)",
  );
});

test("restored names stay within the name length limit", async () => {
  const longName = "x".repeat(50);
  const restoredName = await findRestorableName(longName, 50, takenNames([longName]));
  assert.equal(restoredName.length, 50);
  assert.ok(restoredName.endsWith(" (restored)"));
});
