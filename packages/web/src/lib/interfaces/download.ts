import type { Icon } from "@tabler/icons-react";

export type DesktopPlatform = "windows" | "linux";

export interface DesktopDownload {
  platform: DesktopPlatform;
  icon: Icon;
  href: string;
}

export interface DesktopDownloadFeature {
  title: string;
  description: string;
}
