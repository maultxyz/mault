import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getLatestFirmwareVersion, toEsp32FirmwareReleases } from "../src/lib/firmware-releases";
import type { GitHubRelease } from "../src/lib/interfaces/firmware-releases";

test("GPIO hosts report bundled Pi controller firmware; USB and ordinary hosts keep sketch firmware", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "mault-firmware-"));
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER };
  t.after(async () => {
    if (previous.host === undefined) delete process.env.PI_HOST; else process.env.PI_HOST = previous.host;
    if (previous.sorter === undefined) delete process.env.PI_SORTER; else process.env.PI_SORTER = previous.sorter;
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, "scripts/pi/controller"), { recursive: true });
  await mkdir(join(root, "firmware/main"), { recursive: true });
  await mkdir(join(root, "packages/server"), { recursive: true });
  await writeFile(join(root, "scripts/pi/controller/core.py"), 'VERSION = "pi-0.3.42"\n');
  await writeFile(join(root, "firmware/main/main.ino"), '#define FIRMWARE_VERSION "8.9.10"\n');
  t.mock.method(process, "cwd", () => join(root, "packages/server"));
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "1";
  assert.equal(getLatestFirmwareVersion(), "pi-0.3.42");
  process.env.PI_SORTER = "0";
  assert.equal(getLatestFirmwareVersion(), "8.9.10");
  process.env.PI_HOST = "0";
  process.env.PI_SORTER = "1";
  assert.equal(getLatestFirmwareVersion(), "8.9.10");
});

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
