import type { FirmwareRelease } from "@magic-vault/shared";

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
}

export interface Esp32FirmwareRelease extends FirmwareRelease {
  downloadUrl: string;
}
