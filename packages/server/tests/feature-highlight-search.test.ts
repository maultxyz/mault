import assert from "node:assert/strict";
import { test } from "node:test";
import {
  featureHighlightMatchesSearch,
  filterFeatureHighlightsBySearch,
  type FeatureHighlight,
  type FeatureHighlightText,
} from "@magic-vault/shared";

const translations: Record<string, string> = {
  "featureHighlights.release.scan.title": "Faster scanning",
  "featureHighlights.release.scan.body": "Cards are identified in half the time.",
};

function resolveText(text: FeatureHighlightText): string {
  return text.kind === "literal" ? text.value : (translations[text.key] ?? text.key);
}

const releaseHighlight: FeatureHighlight = {
  id: "release-scan",
  source: "release",
  publishedAt: "2026-11-01T00:00:00.000Z",
  slides: [
    {
      title: { kind: "translated", key: "featureHighlights.release.scan.title" },
      body: { kind: "translated", key: "featureHighlights.release.scan.body" },
      media: null,
      link: null,
    },
  ],
};

const adminHighlight: FeatureHighlight = {
  id: "admin-trades",
  source: "admin",
  publishedAt: "2026-11-10T00:00:00.000Z",
  slides: [
    {
      title: { kind: "literal", value: "Trade links" },
      body: { kind: "literal", value: "Share a link and receive offers." },
      media: {
        type: "video",
        url: "https://example.com/trade.mp4",
        posterUrl: null,
        altText: { kind: "literal", value: "A guest sending an offer" },
      },
      link: { url: "https://example.com", label: { kind: "literal", value: "Read the guide" } },
    },
  ],
};

test("feature highlight search matches translated text in the reader's language", () => {
  assert.equal(featureHighlightMatchesSearch(releaseHighlight, resolveText, "  FASTER "), true);
  assert.equal(featureHighlightMatchesSearch(releaseHighlight, resolveText, "release.scan"), false);
});

test("feature highlight search needs every word, from titles, bodies, link labels or alt text", () => {
  assert.equal(featureHighlightMatchesSearch(adminHighlight, resolveText, "guide offer"), true);
  assert.equal(featureHighlightMatchesSearch(adminHighlight, resolveText, "guest"), true);
  assert.equal(featureHighlightMatchesSearch(adminHighlight, resolveText, "guide scanning"), false);
});

test("an empty search keeps every highlight in order", () => {
  assert.deepEqual(
    filterFeatureHighlightsBySearch([adminHighlight, releaseHighlight], resolveText, "   ").map(({ id }) => id),
    ["admin-trades", "release-scan"],
  );
  assert.deepEqual(
    filterFeatureHighlightsBySearch([adminHighlight, releaseHighlight], resolveText, "half").map(({ id }) => id),
    ["release-scan"],
  );
});
