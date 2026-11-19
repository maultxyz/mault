import { writeStorageSelectionSearchParams } from "@/features/storage/lib/storage-search-params";
import { describe, expect, it } from "vitest";

describe("storage selection search params", () => {
  it("keeps search, sort, page, tab and filters when opening a card in the shown location", () => {
    const searchParams = new URLSearchParams(
      "location=a&q=bolt&sort=name-asc&page=3&tab=verify&rarities=rare",
    );
    writeStorageSelectionSearchParams(searchParams, {
      locationGuid: "a",
      shownLocationGuid: "a",
      scanId: "scan-1",
      reviewParamValue: "1",
    });
    expect(searchParams.toString()).toBe(
      "location=a&q=bolt&sort=name-asc&page=3&tab=verify&rarities=rare&card=scan-1&review=1",
    );
  });

  it("closes the card and review without touching the card query", () => {
    const searchParams = new URLSearchParams(
      "location=a&card=scan-1&review=1&q=bolt&page=2",
    );
    writeStorageSelectionSearchParams(searchParams, {
      locationGuid: "a",
      shownLocationGuid: "a",
    });
    expect(searchParams.toString()).toBe("location=a&q=bolt&page=2");
  });

  it("keeps search and sort but resets page, tab and filters for another location", () => {
    const searchParams = new URLSearchParams(
      "location=a&card=scan-1&q=bolt&sort=name-asc&page=3&tab=verify&rarities=rare&attention=1",
    );
    writeStorageSelectionSearchParams(searchParams, {
      locationGuid: "b",
      shownLocationGuid: "a",
    });
    expect(searchParams.toString()).toBe("location=b&q=bolt&sort=name-asc");
  });

  it("treats the default first location as shown when the URL has no location", () => {
    const searchParams = new URLSearchParams("q=bolt&page=2&colors=R");
    writeStorageSelectionSearchParams(searchParams, {
      locationGuid: "a",
      shownLocationGuid: "a",
      scanId: "scan-1",
    });
    expect(searchParams.toString()).toBe(
      "q=bolt&page=2&colors=R&location=a&card=scan-1",
    );
  });

  it("clears the location and its page when nothing is selected", () => {
    const searchParams = new URLSearchParams("location=a&q=bolt&page=2");
    writeStorageSelectionSearchParams(searchParams, {
      locationGuid: null,
      shownLocationGuid: "a",
    });
    expect(searchParams.toString()).toBe("q=bolt");
  });
});
