import {
  clearActivePickBatch,
  readActivePickBatch,
  writeActivePickBatch,
} from "@/features/business/lib/active-pick-batch";
import { describe, expect, it } from "vitest";

describe("active pick batch", () => {
  it("round trips the written order guids and clears them", () => {
    clearActivePickBatch();
    expect(readActivePickBatch()).toEqual([]);
    writeActivePickBatch(["o1", "o2"]);
    expect(readActivePickBatch()).toEqual(["o1", "o2"]);
    clearActivePickBatch();
    expect(readActivePickBatch()).toEqual([]);
  });

  it("ignores unparsable storage content", () => {
    sessionStorage.setItem("pick-batch:active", "not json");
    expect(readActivePickBatch()).toEqual([]);
    sessionStorage.setItem("pick-batch:active", JSON.stringify(["a", 3, "b"]));
    expect(readActivePickBatch()).toEqual(["a", "b"]);
    clearActivePickBatch();
  });
});
