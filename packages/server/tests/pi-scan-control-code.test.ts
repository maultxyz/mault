import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";
import { readPiScannerControlCode } from "../src/lib/pi-scan/control-code";

for (const angle of [0, 90, 180]) {
  test(`host decodes an actual control QR in a camera frame rotated ${angle} degrees`, async () => {
    const qr = await readFile(
      new URL("./fixtures/scan-control/valid.png", import.meta.url),
    );
    const frame = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "white" },
    })
      .composite([{ input: qr, left: 300, top: 250 }])
      .rotate(angle)
      .jpeg()
      .toBuffer();
    assert.equal(
      await readPiScannerControlCode(frame),
      "mault-control:1?condition=LP&autoFeed=0",
    );
  });
}

test("host returns malformed control payloads for workflow rejection, ignoring other QR codes", async () => {
  const invalid = await readFile(
    new URL("./fixtures/scan-control/invalid.png", import.meta.url),
  );
  const ordinary = await readFile(
    new URL("./fixtures/scan-control/ordinary.png", import.meta.url),
  );
  assert.equal(
    await readPiScannerControlCode(invalid),
    "mault-control:99?unknown=x",
  );
  assert.equal(await readPiScannerControlCode(ordinary), null);
  assert.equal(
    await readPiScannerControlCode(
      await sharp({
        create: { width: 100, height: 100, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
    ),
    null,
  );
});
