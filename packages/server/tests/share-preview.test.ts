import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardOpenGraphImage,
  cardSharePreviewText,
  collectionSharePreviewText,
  listOpenGraphImage,
  parseSharePreviewPath,
  renderSharePreviewHtml,
  shopCatalogSharePreviewText,
  storageSharePreviewText,
  unavailableSharePreview,
} from "../src/lib/share-preview-html";

const GUID = "0b8f5a8e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const WEB_URL = "https://mault.example";
const PUBLIC_API_URL = "https://mault.example/api/public";
const PREVIEW_DEFAULTS = { openGraphImage: null, itemCount: null, topics: [] };
const GAMES = [
  { key: "mtg", name: "Magic: The Gathering", cardCount: 3 },
  { key: "pokemon", name: "Pokémon", cardCount: 1 },
];

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
  assert.deepEqual(
    collectionSharePreviewText({ subjectName: "Binder", cardCount: 1234, games: GAMES, isTradeLink: false }),
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

test("rendered tags are escaped, point at the generated image and private links are never indexed", () => {
  const summary = { subjectName: "Binder", cardCount: 2, games: GAMES, isTradeLink: false };
  const html = renderSharePreviewHtml(
    {
      ...PREVIEW_DEFAULTS,
      title: 'Cards <script>"x"',
      description: "A & B",
      pathWithQuery: `/watch/${GUID}?t=a&b`,
      isIndexable: false,
      openGraphImage: listOpenGraphImage("collection", summary, [], null),
    },
    WEB_URL,
    PUBLIC_API_URL,
  );
  assert.match(html, /<title>Cards &lt;script&gt;&quot;x&quot; \| Mault<\/title>/);
  assert.match(html, /<meta name="description" content="A &amp; B" \/>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.ok(html.includes(`og:url" content="${WEB_URL}/watch/${GUID}?t=a&amp;b"`));
  assert.ok(html.includes(`og:image" content="${PUBLIC_API_URL}/og-image/watch/${GUID}?t=a&amp;b&amp;theme=light"`));
  assert.ok(html.includes(`twitter:image" content="${PUBLIC_API_URL}/og-image/watch/${GUID}?t=a&amp;b&amp;theme=light"`));
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:type" content="image\/jpeg"/);
  assert.ok(
    html.includes(
      'og:image:alt" content="Shared collection: Binder. Magic: The Gathering, Pokémon. 2 cards."',
    ),
  );
  assert.doesNotMatch(html, /application\/ld\+json/);
});

test("public catalogs are indexable with a canonical url and structured data, and unavailable links use the default image", () => {
  const publicHtml = renderSharePreviewHtml(
    {
      ...PREVIEW_DEFAULTS,
      title: "Shop <b>",
      description: "x",
      pathWithQuery: `/shop/${GUID}`,
      isIndexable: true,
      itemCount: 4,
      topics: ["Magic: The Gathering"],
    },
    WEB_URL,
    PUBLIC_API_URL,
  );
  assert.match(publicHtml, /<meta name="robots" content="index, follow" \/>/);
  assert.ok(publicHtml.includes(`<link rel="canonical" href="${WEB_URL}/shop/${GUID}" />`));
  const jsonLd = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(publicHtml)?.[1] ?? "";
  assert.doesNotMatch(jsonLd, /<b>/);
  const structuredData = JSON.parse(jsonLd);
  assert.equal(structuredData["@type"], "CollectionPage");
  assert.equal(structuredData.name, "Shop <b>");
  assert.equal(structuredData.url, `${WEB_URL}/shop/${GUID}`);
  assert.equal(structuredData.mainEntity.numberOfItems, 4);
  assert.deepEqual(structuredData.about, [{ "@type": "Thing", name: "Magic: The Gathering" }]);
  assert.equal(structuredData.isPartOf["@id"], `${WEB_URL}/#website`);
  const unavailableHtml = renderSharePreviewHtml(
    unavailableSharePreview("/watch/x"),
    WEB_URL,
    PUBLIC_API_URL,
  );
  assert.match(unavailableHtml, /og:image" content="https:\/\/mault\.example\/og\/mault-og\.jpg"/);
  assert.match(unavailableHtml, /og:image:width" content="1200"/);
  assert.match(unavailableHtml, /Shared link unavailable \| Mault/);
});

test("long descriptions are cut to the preview limit", () => {
  const html = renderSharePreviewHtml(
    { ...PREVIEW_DEFAULTS, title: "t", description: "word ".repeat(100), pathWithQuery: "/", isIndexable: false },
    WEB_URL,
    PUBLIC_API_URL,
  );
  const description = /name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.ok(description.length <= 200);
  assert.ok(description.endsWith("..."));
});

test("open graph images describe the link, its games and the cards shown", () => {
  const tradeImage = listOpenGraphImage(
    "storage",
    { subjectName: "Box 1", cardCount: 1234, games: GAMES, isTradeLink: true },
    [{ name: "Lightning Bolt", imageUrl: "https://cards.scryfall.io/a.jpg" }],
    null,
  );
  assert.equal(tradeImage.eyebrow, "Trade link");
  assert.equal(tradeImage.headline, "Box 1");
  assert.equal(tradeImage.subtitle, "Magic: The Gathering, Pokémon");
  assert.deepEqual(tradeImage.stats, [
    { icon: "cards", text: "1,234 cards" },
    { icon: "tradeOffers", text: "Open to trade offers" },
  ]);
  assert.deepEqual(tradeImage.visual, { kind: "cards", cardImageUrls: ["https://cards.scryfall.io/a.jpg"] });
  assert.match(tradeImage.alt, /Card art: Lightning Bolt\.$/);

  const shopImage = listOpenGraphImage(
    "shopCatalog",
    { subjectName: "Shop", cardCount: 5, games: [], isTradeLink: false },
    [],
    "org-1",
  );
  assert.equal(shopImage.eyebrow, "Card shop");
  assert.equal(shopImage.subtitle, "Shared on Mault");
  assert.deepEqual(shopImage.stats, [{ icon: "cards", text: "5 cards for sale" }]);
  assert.deepEqual(shopImage.visual, { kind: "shopPhoto", orgId: "org-1", fallbackCardImageUrls: [] });

  const cardImage = cardOpenGraphImage(
    {
      name: "Lightning Bolt",
      setName: "Magic 2010",
      collectorNumber: "146",
      condition: "NM",
      isFoil: false,
      foilType: null,
      formattedPrice: "$3.50",
    },
    null,
  );
  assert.equal(cardImage.headline, "Lightning Bolt");
  assert.equal(cardImage.subtitle, "Magic 2010 #146");
  assert.deepEqual(cardImage.stats, [
    { icon: "condition", text: "NM" },
    { icon: "price", text: "$3.50" },
  ]);
  assert.deepEqual(cardImage.visual, { kind: "cards", cardImageUrls: [] });
});
