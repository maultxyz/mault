import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { toPortraitCardImage } from "../src/lib/card-image";

const RED = [255, 0, 0];
const WHITE = [255, 255, 255];

async function pngWithRedTopLeftPixel(width: number, height: number): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3, 255);
  pixels.set(RED, 0);
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function pixelAt(image: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 3)];
}

test("a landscape image is turned 90 degrees clockwise", async () => {
  const portrait = await toPortraitCardImage(await pngWithRedTopLeftPixel(4, 2));
  const { width, height } = await sharp(portrait).metadata();
  assert.deepEqual([width, height], [2, 4]);
  assert.deepEqual(await pixelAt(portrait, 1, 0), RED);
  assert.deepEqual(await pixelAt(portrait, 0, 0), WHITE);
});

test("portrait and square images are returned untouched", async () => {
  const portrait = await pngWithRedTopLeftPixel(2, 4);
  const square = await pngWithRedTopLeftPixel(3, 3);
  assert.equal(await toPortraitCardImage(portrait), portrait);
  assert.equal(await toPortraitCardImage(square), square);
});

test("the EXIF orientation decides whether an image is landscape", async () => {
  const storedLandscapeShownPortrait = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "white" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  assert.equal(
    await toPortraitCardImage(storedLandscapeShownPortrait),
    storedLandscapeShownPortrait,
  );

  const storedPortraitShownLandscape = await sharp({
    create: { width: 20, height: 40, channels: 3, background: "white" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const turned = await sharp(await toPortraitCardImage(storedPortraitShownLandscape)).metadata();
  assert.deepEqual([turned.width, turned.height, turned.orientation ?? 1], [20, 40, 1]);
});
