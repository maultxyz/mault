import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MARKETING_OPEN_GRAPH_PAGES,
  OPEN_GRAPH_DEFAULT_THEME,
  isMarketingOpenGraphPageKey,
  marketingOpenGraphImageAlt,
  marketingOpenGraphImagePath,
  openGraphThemeOf,
} from "@magic-vault/shared";
import sharp from "sharp";
import { renderOpenGraphImage } from "../src/lib/open-graph-image";
import {
  fitTextBlock,
  openGraphFonts,
  withDrawableCharacters,
  wrapText,
} from "../src/lib/open-graph-text";

test("text wraps within the width and long headlines end in an ellipsis", () => {
  const { bold } = openGraphFonts();
  const lines = wrapText(bold, "Every card, right where it belongs.", 64, 452);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(bold.getAdvanceWidth(line, 64) <= 452);
  const block = fitTextBlock(bold, "word ".repeat(60).trim(), [64, 36], 452, 3);
  assert.equal(block.fontSize, 36);
  assert.equal(block.lines.length, 3);
  assert.ok(block.lines[2].endsWith("..."));
});

test("characters the font can't draw are dropped instead of drawn as boxes", () => {
  const { bold } = openGraphFonts();
  assert.equal(withDrawableCharacters(bold, "日本  Pokémon\nShop"), "Pokémon Shop");
});

test("images render at the Open Graph size in both themes without any card art", async () => {
  const content = {
    eyebrow: "Card shop",
    headline: "A shop",
    subtitle: "5 cards for sale",
    stats: [{ icon: "cards" as const, text: "5 cards for sale" }],
    visual: { kind: "cards" as const, cardImageUrls: [] },
    alt: "",
  };
  const cornerBrightness: number[] = [];
  for (const theme of ["light", "dark"] as const) {
    const image = await renderOpenGraphImage(content, theme);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    const corner = await sharp(image).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer();
    cornerBrightness.push(corner[0]);
  }
  assert.ok(cornerBrightness[0] > 200);
  assert.ok(cornerBrightness[1] < 40);
});

test("unknown themes fall back to the default", () => {
  assert.equal(openGraphThemeOf("dark"), "dark");
  assert.equal(openGraphThemeOf("neon"), OPEN_GRAPH_DEFAULT_THEME);
  assert.equal(openGraphThemeOf(null), OPEN_GRAPH_DEFAULT_THEME);
});

test("marketing image paths carry the theme and a content version, and only known pages resolve", () => {
  assert.match(
    marketingOpenGraphImagePath("build", "dark"),
    /^\/og-image\/pages\/build\.jpg\?theme=dark&v=[0-9a-z]+$/,
  );
  assert.notEqual(marketingOpenGraphImagePath("build", "dark"), marketingOpenGraphImagePath("build", "light"));
  assert.notEqual(marketingOpenGraphImagePath("build"), marketingOpenGraphImagePath("home"));
  assert.ok(isMarketingOpenGraphPageKey("selfHost"));
  assert.ok(!isMarketingOpenGraphPageKey("toString"));
  assert.ok(marketingOpenGraphImageAlt("build").includes(MARKETING_OPEN_GRAPH_PAGES.build.headline));
});
