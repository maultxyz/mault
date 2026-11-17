import assert from "node:assert/strict";
import { test } from "node:test";
import { toEsp32FirmwareReleases } from "../src/lib/firmware-releases";
import type { GitHubRelease } from "../src/lib/interfaces/firmware-releases";

function release(overrides: Partial<GitHubRelease>): GitHubRelease {
  return {
    tag_name: "firmware-v2.10.3",
    draft: false,
    prerelease: false,
    published_at: "2026-10-26T00:49:52Z",
    assets: [
      { name: "esp32-latest.bin", browser_download_url: "https://example.test/esp32.bin" },
    ],
    ...overrides,
  };
}

test("published firmware releases with an ESP32 binary are listed by version", () => {
  assert.deepEqual(toEsp32FirmwareReleases([release({})]), [
    {
      version: "2.10.3",
      publishedAt: "2026-10-26T00:49:52Z",
      downloadUrl: "https://example.test/esp32.bin",
    },
  ]);
});

test("drafts, pre-releases, other tags and releases without an ESP32 binary are skipped", () => {
  assert.deepEqual(
    toEsp32FirmwareReleases([
      release({ draft: true }),
      release({ tag_name: "firmware-dev", prerelease: true }),
      release({ tag_name: "desktop-latest" }),
      release({ published_at: null }),
      release({ assets: [] }),
    ]),
    [],
  );
});
