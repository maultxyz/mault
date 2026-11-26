import { describe, expect, it } from "vitest";
import type { OrgProfile } from "@magic-vault/shared";
import {
  moveListItem,
  orgProfileFormValues,
  toggleShowcaseScanId,
} from "./org-profile-form";

const savedProfile: OrgProfile = {
  handle: "kenny",
  displayName: "Kenny's Cards",
  bio: "Singles and sealed",
  links: [{ kind: "website", url: "https://example.com", label: "" }],
  showcaseCards: [
    { scanId: "b", name: "Bolt", setCode: "lea", imageUrl: null },
    { scanId: "a", name: "Ancestral", setCode: null, imageUrl: null },
  ],
  shopCatalogGuids: ["catalog"],
  showsPrices: true,
  isPublished: true,
  shortUrl: null,
  updatedAt: "2026-11-26T00:00:00.000Z",
};

describe("orgProfileFormValues", () => {
  it("prefills a new profile from the organization name", () => {
    const values = orgProfileFormValues(null, "Kenny's Card Shop");
    expect(values.handle).toBe("kenny-s-card-shop");
    expect(values.displayName).toBe("Kenny's Card Shop");
    expect(values.isPublished).toBe(false);
    expect(values.showcaseScanIds).toEqual([]);
  });

  it("keeps the saved showcase order", () => {
    const values = orgProfileFormValues(savedProfile, "Ignored");
    expect(values.handle).toBe("kenny");
    expect(values.showcaseScanIds).toEqual(["b", "a"]);
    expect(values.shopCatalogGuids).toEqual(["catalog"]);
  });
});

describe("moveListItem", () => {
  it("moves an item to a new index", () => {
    expect(moveListItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveListItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
  });

  it("ignores moves past either end", () => {
    expect(moveListItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveListItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
  });
});

describe("toggleShowcaseScanId", () => {
  it("adds and removes a card", () => {
    expect(toggleShowcaseScanId(["a"], "b", 3)).toEqual(["a", "b"]);
    expect(toggleShowcaseScanId(["a", "b"], "a", 3)).toEqual(["b"]);
  });

  it("refuses to add past the limit but still removes", () => {
    expect(toggleShowcaseScanId(["a", "b"], "c", 2)).toEqual(["a", "b"]);
    expect(toggleShowcaseScanId(["a", "b"], "b", 2)).toEqual(["a"]);
  });
});
