import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardSharePreviewText,
  collectionSharePreviewText,
  parseSharePreviewPath,
  renderSharePreviewHtml,
  shopCatalogSharePreviewText,
  storageSharePreviewText,
  unavailableSharePreview,
} from "../src/lib/share-preview-html";

const GUID = "0b8f5a8e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const WEB_URL = "https://mault.example";

test("share paths resolve to their link kind, guid and token", () => {
  assert.deepEqual(parseSharePreviewPath(`/watch/${GUID}?t=abc.def`), {
    kind: "collection",
    subjectGuid: GUID,
    token: "abc.def",
    pathWithQuery: `/watch/${GUID}?t=abc.def`,
  });
  assert.equal(parseSharePreviewPath(`/shared/storage/${GUID}?t=x`)?.kind, "storage");
  assert.equal(parseSharePreviewPath(`/shared/card/${GUID.toUpperCase()}?t=x`)?.subjectGuid, GUID);
  assert.deepEqual(parseSharePreviewPath(`/shop/${GUID}/`), {
    kind: "shopCatalog",
    subjectGuid: GUID,
    token: null,
    pathWithQuery: `/shop/${GUID}/`,
  });
});

test("other paths have no share preview", () => {
  assert.equal(parseSharePreviewPath("/watch/not-a-guid?t=x"), null);
  assert.equal(parseSharePreviewPath(`/watch/${GUID}/cards?t=x`), null);
  assert.equal(parseSharePreviewPath(`/app/collections/${GUID}`), null);
  assert.equal(parseSharePreviewPath("/shared/other"), null);
});

test("collection and storage previews describe the link's purpose and games", () => {
  const games = [
    { key: "mtg", name: "Magic: The Gathering", cardCount: 3 },
    { key: "pokemon", name: "Pokémon", cardCount: 1 },
  ];
  assert.deepEqual(
    collectionSharePreviewText({ subjectName: "Binder", cardCount: 1234, games, isTradeLink: false }),
    {
      title: "Binder",
      description: "Browse 1,234 cards from the Binder collection: Magic: The Gathering, Pokémon.",
    },
  );
  assert.equal(
    storageSharePreviewText({ subjectName: "Box 1", cardCount: 1, games: [], isTradeLink: true }).title,
    "Trade for cards from Box 1",
  );
  assert.match(
    storageSharePreviewText({ subjectName: "Box 1", cardCount: 1, games: [], isTradeLink: true })
      .description,
    /^Browse 1 card stored in Box 1 and send a trade offer\.$/,
  );
  assert.match(
    shopCatalogSharePreviewText({
      subjectName: "Shop",
      cardCount: 5,
      games: [1, 2, 3, 4, 5].map((index) => ({ key: `g${index}`, name: `Game ${index}`, cardCount: 1 })),
      isTradeLink: false,
    }).description,
    /Game 1, Game 2, Game 3 and 2 more\.$/,
  );
});

test("card previews list the printing, condition, finish and price", () => {
  assert.deepEqual(
    cardSharePreviewText({
      name: "Lightning Bolt",
      setName: "Magic 2010",
      collectorNumber: "146",
      condition: "NM",
      isFoil: true,
      foilType: null,
      formattedPrice: "$3.50",
    }),
    {
      title: "Lightning Bolt",
      description: "Lightning Bolt · Magic 2010 #146 · NM · Foil · $3.50",
    },
  );
});

test("rendered tags are escaped and private links are never indexed", () => {
  const html = renderSharePreviewHtml(
    {
      title: 'Cards <script>"x"',
      description: "A & B",
      pathWithQuery: `/watch/${GUID}?t=a&b`,
      isIndexable: false,
      image: { url: "/api/cards/netdeck-image/x", alt: "Art", width: null, height: null },
    },
    WEB_URL,
  );
  assert.match(html, /<title>Cards &lt;script&gt;&quot;x&quot; \| Mault<\/title>/);
  assert.match(html, /<meta name="description" content="A &amp; B" \/>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, new RegExp(`og:url" content="${WEB_URL}/watch/${GUID}\\?t=a&amp;b"`));
  assert.match(html, /og:image" content="https:\/\/mault\.example\/api\/cards\/netdeck-image\/x"/);
  assert.doesNotMatch(html, /og:image:width/);
});

test("public catalogs are indexable with a canonical url, and unavailable links use the default image", () => {
  const publicHtml = renderSharePreviewHtml(
    {
      title: "Shop",
      description: "x",
      pathWithQuery: `/shop/${GUID}`,
      isIndexable: true,
      image: null,
    },
    WEB_URL,
  );
  assert.match(publicHtml, /<meta name="robots" content="index, follow" \/>/);
  assert.match(publicHtml, new RegExp(`<link rel="canonical" href="${WEB_URL}/shop/${GUID}" />`));
  const unavailableHtml = renderSharePreviewHtml(unavailableSharePreview("/watch/x"), WEB_URL);
  assert.match(unavailableHtml, /og:image" content="https:\/\/mault\.example\/og\/mault-og\.jpg"/);
  assert.match(unavailableHtml, /og:image:width" content="1200"/);
  assert.match(unavailableHtml, /Shared link unavailable \| Mault/);
});

test("long descriptions are cut to the preview limit", () => {
  const html = renderSharePreviewHtml(
    { title: "t", description: "word ".repeat(100), pathWithQuery: "/", isIndexable: false, image: null },
    WEB_URL,
  );
  const description = /name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.ok(description.length <= 200);
  assert.ok(description.endsWith("..."));
});
