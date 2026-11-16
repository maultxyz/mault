import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScanImageSide, scanImageDownloadFileName } from "@magic-vault/shared";
import sharp from "sharp";
import { renderBrandedScanImage } from "../src/lib/branded-scan-image";
import {
  BRANDED_SCAN_IMAGE_CARD_ASPECT_RATIO,
  BRANDED_SCAN_IMAGE_MIN_WIDTH,
  BRANDED_SCAN_IMAGE_STRIP_HEIGHT_RATIO,
} from "../src/lib/constants/branded-scan-image";

test("branded scan image squishes the photo to card proportions and adds the strip below", async () => {
  const photo = await sharp({
    create: { width: 900, height: 1000, channels: 3, background: "#3366aa" },
  })
    .jpeg()
    .toBuffer();
  const branded = await renderBrandedScanImage(photo);
  const { width, height, format } = await sharp(branded).metadata();
  const cardHeight = Math.round(900 / BRANDED_SCAN_IMAGE_CARD_ASPECT_RATIO);
  const stripHeight = Math.round(900 * BRANDED_SCAN_IMAGE_STRIP_HEIGHT_RATIO);
  assert.equal(format, "jpeg");
  assert.equal(width, 900);
  assert.equal(height, cardHeight + stripHeight);
});

test("branded scan image upscales small photos to the minimum width", async () => {
  const photo = await sharp({
    create: { width: 200, height: 280, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  const { width } = await sharp(await renderBrandedScanImage(photo)).metadata();
  assert.equal(width, BRANDED_SCAN_IMAGE_MIN_WIDTH);
});

test("scan image download names are slugged per side", () => {
  assert.equal(scanImageDownloadFileName("Jace, the Mind Sculptor", "front"), "jace-the-mind-sculptor-mault.jpg");
  assert.equal(scanImageDownloadFileName("Pokémon Café", "back"), "pokemon-cafe-back-mault.jpg");
  assert.equal(scanImageDownloadFileName(undefined, "front"), "card-mault.jpg");
  assert.equal(parseScanImageSide("back"), "back");
  assert.equal(parseScanImageSide("sideways"), "front");
});
