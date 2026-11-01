import { createCachedValue } from "./cached-value";
import { CARD_API_USER_AGENT } from "./constants/card-search";
import {
  ESP32_FIRMWARE_ASSET_NAME,
  FIRMWARE_GITHUB_RELEASES_URL,
  FIRMWARE_RELEASE_TAG_PREFIX,
} from "./constants/firmware-releases";
import type {
  Esp32FirmwareRelease,
  GitHubRelease,
} from "./interfaces/firmware-releases";

export function getLatestFirmwareVersion(): string | null {
  return (
    process.env.LATEST_FIRMWARE_VERSION ||
    process.env.VITE_LATEST_FIRMWARE_VERSION ||
    null
  );
}

export function toEsp32FirmwareReleases(
  releases: GitHubRelease[],
): Esp32FirmwareRelease[] {
  return releases.flatMap((release) => {
    const esp32Asset = release.assets.find(
      (asset) => asset.name === ESP32_FIRMWARE_ASSET_NAME,
    );
    if (
      release.draft ||
      release.prerelease ||
      !release.published_at ||
      !esp32Asset ||
      !release.tag_name.startsWith(FIRMWARE_RELEASE_TAG_PREFIX)
    ) {
      return [];
    }
    return [
      {
        version: release.tag_name.slice(FIRMWARE_RELEASE_TAG_PREFIX.length),
        publishedAt: release.published_at,
        downloadUrl: esp32Asset.browser_download_url,
      },
    ];
  });
}

async function fetchEsp32FirmwareReleases(): Promise<Esp32FirmwareRelease[]> {
  const response = await fetch(FIRMWARE_GITHUB_RELEASES_URL, {
    headers: {
      "User-Agent": CARD_API_USER_AGENT,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub firmware releases request failed (${response.status})`);
  }
  return toEsp32FirmwareReleases((await response.json()) as GitHubRelease[]);
}

export const esp32FirmwareReleasesCache = createCachedValue(
  fetchEsp32FirmwareReleases,
);

export async function downloadEsp32Firmware(
  release: Esp32FirmwareRelease,
): Promise<Buffer | null> {
  const response = await fetch(release.downloadUrl, {
    headers: {
      "User-Agent": CARD_API_USER_AGENT,
      Accept: "application/octet-stream",
    },
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}
