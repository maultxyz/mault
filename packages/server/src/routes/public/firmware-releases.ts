import { Hono } from "hono";
import {
  FIRMWARE_BINARY_CACHE_MAX_AGE_SECONDS,
  FIRMWARE_RELEASES_MAX_AGE_MS,
} from "../../lib/constants/timing";
import {
  downloadEsp32Firmware,
  esp32FirmwareReleasesCache,
} from "../../lib/firmware-releases";
import type { AppEnv } from "../../middleware/auth";

export const firmwareReleasesRoute = new Hono<AppEnv>()
  .get("/firmware-releases", async (c) => {
    const releases = await esp32FirmwareReleasesCache.get(
      FIRMWARE_RELEASES_MAX_AGE_MS,
    );
    return c.json({
      success: true,
      data: releases.map(({ version, publishedAt }) => ({ version, publishedAt })),
    });
  })
  .get("/firmware-releases/:version/esp32.bin", async (c) => {
    const releases = await esp32FirmwareReleasesCache.get(
      FIRMWARE_RELEASES_MAX_AGE_MS,
    );
    const release = releases.find(
      (candidate) => candidate.version === c.req.param("version"),
    );
    if (!release) {
      return c.json({ success: false, message: "Firmware release not found." }, 404);
    }
    const firmware = await downloadEsp32Firmware(release);
    if (!firmware) {
      return c.json({ success: false, message: "Failed to download firmware." }, 502);
    }
    return c.body(firmware, 200, {
      "Content-Type": "application/octet-stream",
      "Cache-Control": `public, max-age=${FIRMWARE_BINARY_CACHE_MAX_AGE_SECONDS}`,
    });
  });
