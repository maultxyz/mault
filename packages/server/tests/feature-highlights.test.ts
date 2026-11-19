import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURE_HIGHLIGHT_MAX_AGE_DAYS,
  FEATURE_HIGHLIGHT_MAX_SHOWN,
  FEATURE_HIGHLIGHT_MAX_SLIDES,
  FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH,
  type AdminFeatureHighlightSlideInput,
  type FeatureHighlight,
} from "@magic-vault/shared";
import { FEATURE_HIGHLIGHT_SEEN_MAX_IDS } from "../src/lib/constants/feature-highlights";
import {
  adminFeatureHighlightInputSchema,
  markFeatureHighlightsSeenSchema,
} from "../src/lib/feature-highlight-input";
import {
  parseFeatureHighlightMediaUpload,
  storageKeyFromPresignedFeatureHighlightUrl,
  storedFeatureHighlightMediaKeyOf,
} from "../src/lib/feature-highlight-media";
import {
  filterKnownFeatureHighlightIds,
  selectFeatureHighlights,
  toAdminSourcedFeatureHighlight,
} from "../src/lib/feature-highlight-selection";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-19T12:00:00.000Z");
const STORED_KEY =
  "system/feature-highlights/2f1c6a52-6a0f-4a4f-9a3e-0c8f4b4f4e11.mp4";

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function plainSlide(
  overrides: Partial<AdminFeatureHighlightSlideInput> = {},
): AdminFeatureHighlightSlideInput {
  return {
    title: "Faster scans",
    body: "Scans finish in half the time.",
    mediaType: null,
    mediaUrl: null,
    mediaPosterUrl: null,
    mediaAltText: "",
    linkUrl: null,
    linkLabel: "",
    ...overrides,
  };
}

function adminHighlight(guid: string, publishedAt: Date): FeatureHighlight {
  return toAdminSourcedFeatureHighlight({
    guid,
    publishedAt,
    slides: [plainSlide()],
  });
}

function releaseHighlight(id: string, publishedAt: Date): FeatureHighlight {
  return {
    id,
    source: "release",
    slides: [
      {
        title: { kind: "translated", key: "featureHighlights.release.example.title" },
        body: { kind: "translated", key: "featureHighlights.release.example.body" },
        media: null,
        link: null,
      },
    ],
    publishedAt: publishedAt.toISOString(),
  };
}

function idsOf(highlights: FeatureHighlight[]): string[] {
  return highlights.map((highlight) => highlight.id);
}

function parseInput(
  slides: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return adminFeatureHighlightInputSchema.safeParse({
    isPublished: true,
    publishedAt: "2026-11-19T00:00:00.000Z",
    slides,
    ...overrides,
  });
}

test("feature highlights: release and admin highlights merge newest first", () => {
  const result = selectFeatureHighlights({
    highlights: [
      releaseHighlight("release-old", daysAgo(10)),
      adminHighlight("admin-new", daysAgo(1)),
      releaseHighlight("release-mid", daysAgo(5)),
    ],
    seenHighlightIds: new Set(),
    includesSeenHighlights: false,
    now,
  });
  assert.deepEqual(idsOf(result.highlights), [
    "admin-new",
    "release-mid",
    "release-old",
  ]);
  assert.deepEqual(result.seenHighlightIds, []);
});

test("feature highlights: future and too old highlights are left out", () => {
  const result = selectFeatureHighlights({
    highlights: [
      adminHighlight("scheduled", new Date(now.getTime() + 60_000)),
      adminHighlight("expired", daysAgo(FEATURE_HIGHLIGHT_MAX_AGE_DAYS + 1)),
      adminHighlight("edge", daysAgo(FEATURE_HIGHLIGHT_MAX_AGE_DAYS)),
      releaseHighlight("current", daysAgo(2)),
    ],
    seenHighlightIds: new Set(),
    includesSeenHighlights: false,
    now,
  });
  assert.deepEqual(idsOf(result.highlights), ["current", "edge"]);
});

test("feature highlights: seen highlights are hidden unless includeSeen", () => {
  const highlights = [
    adminHighlight("first", daysAgo(1)),
    releaseHighlight("second", daysAgo(2)),
    adminHighlight("third", daysAgo(3)),
  ];
  const seenHighlightIds = new Set(["second", "not-in-window"]);
  const unseen = selectFeatureHighlights({
    highlights,
    seenHighlightIds,
    includesSeenHighlights: false,
    now,
  });
  assert.deepEqual(idsOf(unseen.highlights), ["first", "third"]);
  assert.deepEqual(unseen.seenHighlightIds, []);

  const all = selectFeatureHighlights({
    highlights,
    seenHighlightIds,
    includesSeenHighlights: true,
    now,
  });
  assert.deepEqual(idsOf(all.highlights), ["first", "second", "third"]);
  assert.deepEqual(all.seenHighlightIds, ["second"]);
});

test("feature highlights: results are capped after seen filtering", () => {
  const highlights = Array.from(
    { length: FEATURE_HIGHLIGHT_MAX_SHOWN + 3 },
    (_, index) => adminHighlight(`highlight-${index}`, daysAgo(index + 1)),
  );
  const unseen = selectFeatureHighlights({
    highlights,
    seenHighlightIds: new Set(["highlight-0"]),
    includesSeenHighlights: false,
    now,
  });
  assert.equal(unseen.highlights.length, FEATURE_HIGHLIGHT_MAX_SHOWN);
  assert.equal(unseen.highlights[0].id, "highlight-1");

  const withSeen = selectFeatureHighlights({
    highlights,
    seenHighlightIds: new Set(["highlight-0"]),
    includesSeenHighlights: true,
    now,
  });
  assert.equal(withSeen.highlights.length, FEATURE_HIGHLIGHT_MAX_SHOWN);
  assert.equal(withSeen.highlights[0].id, "highlight-0");
  assert.deepEqual(withSeen.seenHighlightIds, ["highlight-0"]);
});

test("feature highlights: admin slides map to literal text", () => {
  const highlight = toAdminSourcedFeatureHighlight({
    guid: "guid-1",
    publishedAt: daysAgo(1),
    slides: [
      plainSlide({
        mediaType: "image",
        mediaUrl: "https://example.com/a.gif",
        mediaAltText: "A card sliding into a bin",
        linkUrl: "https://example.com/docs",
        linkLabel: "Read more",
      }),
      plainSlide(),
    ],
  });
  assert.equal(highlight.source, "admin");
  assert.deepEqual(highlight.slides[0], {
    title: { kind: "literal", value: "Faster scans" },
    body: { kind: "literal", value: "Scans finish in half the time." },
    media: {
      type: "image",
      url: "https://example.com/a.gif",
      posterUrl: null,
      altText: { kind: "literal", value: "A card sliding into a bin" },
    },
    link: {
      url: "https://example.com/docs",
      label: { kind: "literal", value: "Read more" },
    },
  });
  assert.equal(highlight.slides[1].media, null);
  assert.equal(highlight.slides[1].link, null);
});

test("feature highlights: mark seen keeps only known ids, once each", () => {
  const releaseId = releaseHighlight("release-example", now).id;
  assert.deepEqual(
    filterKnownFeatureHighlightIds(
      ["admin-guid", "unknown", releaseId, "admin-guid"],
      new Set([releaseId, "admin-guid"]),
    ),
    ["admin-guid", releaseId],
  );
  assert.equal(
    markFeatureHighlightsSeenSchema.safeParse({ highlightIds: ["a"] }).success,
    true,
  );
  assert.equal(
    markFeatureHighlightsSeenSchema.safeParse({
      highlightIds: Array.from(
        { length: FEATURE_HIGHLIGHT_SEEN_MAX_IDS + 1 },
        (_, index) => `id-${index}`,
      ),
    }).success,
    false,
  );
  assert.equal(
    markFeatureHighlightsSeenSchema.safeParse({ highlightIds: [""] }).success,
    false,
  );
  assert.equal(markFeatureHighlightsSeenSchema.safeParse(null).success, false);
});

test("feature highlight input: valid input is trimmed and normalized", () => {
  const result = parseInput([
    plainSlide({
      title: "  Faster scans  ",
      linkUrl: "",
      linkLabel: "ignored without a link",
      mediaAltText: "ignored without media",
    }),
  ]);
  assert.ok(result.success);
  assert.equal(result.data.slides[0].title, "Faster scans");
  assert.equal(result.data.slides[0].linkUrl, null);
  assert.equal(result.data.slides[0].linkLabel, "");
  assert.equal(result.data.slides[0].mediaAltText, "");
  assert.equal(result.data.publishedAt, "2026-11-19T00:00:00.000Z");
});

test("feature highlight input: slide count and lengths are enforced", () => {
  assert.equal(parseInput([]).success, false);
  assert.equal(
    parseInput(
      Array.from({ length: FEATURE_HIGHLIGHT_MAX_SLIDES + 1 }, () =>
        plainSlide(),
      ),
    ).success,
    false,
  );
  assert.equal(
    parseInput([
      plainSlide({ title: "x".repeat(FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH + 1) }),
    ]).success,
    false,
  );
  assert.equal(parseInput([plainSlide({ title: "   " })]).success, false);
  assert.equal(
    parseInput([plainSlide()], { publishedAt: "not a date" }).success,
    false,
  );
});

test("feature highlight input: links and external media must be http(s)", () => {
  assert.equal(
    parseInput([
      plainSlide({ linkUrl: "javascript:alert(1)", linkLabel: "Go" }),
    ]).success,
    false,
  );
  assert.equal(
    parseInput([plainSlide({ linkUrl: "https://example.com", linkLabel: "" })])
      .success,
    false,
  );
  assert.equal(
    parseInput([
      plainSlide({
        mediaType: "video",
        mediaUrl: "ftp://example.com/a.mp4",
        mediaAltText: "Demo",
      }),
    ]).success,
    false,
  );
  assert.equal(
    parseInput([
      plainSlide({
        mediaType: "video",
        mediaUrl: "https://example.com/a.mp4",
        mediaPosterUrl: "https://example.com/a.jpg",
        mediaAltText: "Demo",
      }),
    ]).success,
    true,
  );
});

test("feature highlight input: media needs a type, alt text and a supported source", () => {
  const withMedia = (overrides: Partial<AdminFeatureHighlightSlideInput>) =>
    parseInput([plainSlide(overrides)]).success;
  assert.equal(
    withMedia({ mediaUrl: "https://example.com/a.png", mediaAltText: "A" }),
    false,
  );
  assert.equal(
    withMedia({ mediaType: "image", mediaUrl: "https://example.com/a.png" }),
    false,
  );
  assert.equal(
    withMedia({
      mediaType: "image",
      mediaUrl: "data:image/png;base64,iVBORw0KGgo=",
      mediaAltText: "Logo",
    }),
    true,
  );
  assert.equal(
    withMedia({
      mediaType: "video",
      mediaUrl: "data:video/mp4;base64,AAAA",
      mediaAltText: "Demo",
    }),
    false,
  );
  assert.equal(
    withMedia({
      mediaType: "video",
      mediaUrl: `storage:${STORED_KEY}`,
      mediaAltText: "Demo",
    }),
    true,
  );
  assert.equal(
    withMedia({
      mediaType: "image",
      mediaUrl: "storage:orgs/abc/secret.png",
      mediaAltText: "Demo",
    }),
    false,
  );
  assert.equal(
    withMedia({
      mediaType: "image",
      mediaUrl: "https://example.com/a.png",
      mediaPosterUrl: "https://example.com/b.png",
      mediaAltText: "A",
    }),
    false,
  );
});

test("feature highlight media: stored keys round-trip from presigned URLs", () => {
  const location = {
    endpointUrl: "https://storage.example.com",
    bucketName: "mault",
  };
  assert.equal(
    storedFeatureHighlightMediaKeyOf(`storage:${STORED_KEY}`),
    STORED_KEY,
  );
  assert.equal(storedFeatureHighlightMediaKeyOf("storage:../etc/passwd"), null);
  assert.equal(
    storageKeyFromPresignedFeatureHighlightUrl(
      `https://storage.example.com/mault/${STORED_KEY}?X-Amz-Signature=abc`,
      location,
    ),
    STORED_KEY,
  );
  assert.equal(
    storageKeyFromPresignedFeatureHighlightUrl(
      `https://elsewhere.example.com/mault/${STORED_KEY}`,
      location,
    ),
    null,
  );
  assert.equal(
    storageKeyFromPresignedFeatureHighlightUrl(
      "https://storage.example.com/mault/orgs/abc/scan.jpg",
      location,
    ),
    null,
  );
});

test("feature highlight media: uploads check type, size and storage", () => {
  const image = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
  const video = new File([new Uint8Array(10)], "a.mp4", { type: "video/mp4" });
  const text = new File(["hi"], "a.txt", { type: "text/plain" });
  assert.deepEqual(parseFeatureHighlightMediaUpload({ file: image }, false), {
    success: true,
    file: image,
    contentType: "image/png",
    mediaType: "image",
  });
  assert.equal(
    parseFeatureHighlightMediaUpload({ file: video }, true).success,
    true,
  );
  const videoWithoutStorage = parseFeatureHighlightMediaUpload(
    { file: video },
    false,
  );
  assert.equal(videoWithoutStorage.success, false);
  assert.match(
    videoWithoutStorage.success ? "" : videoWithoutStorage.message,
    /URL/,
  );
  assert.equal(
    parseFeatureHighlightMediaUpload({ file: text }, true).success,
    false,
  );
  assert.equal(parseFeatureHighlightMediaUpload({}, true).success, false);
});
