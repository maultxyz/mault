import { REPO_URL } from "@/lib/constants/links";
import type { DesktopDownload } from "@/lib/interfaces/download";
import {
  IconBell,
  IconBrandUbuntu,
  IconBrandWindows,
  IconLayoutBottombar,
  IconPictureInPicture,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";

export const DOWNLOAD_PATH = "/download";
export const DESKTOP_RELEASE_URL = `${REPO_URL}/releases/tag/desktop-latest`;
const DESKTOP_DOWNLOAD_BASE_URL = `${REPO_URL}/releases/download/desktop-latest`;

export const DESKTOP_DOWNLOADS: DesktopDownload[] = [
  {
    platform: "windows",
    icon: IconBrandWindows,
    href: `${DESKTOP_DOWNLOAD_BASE_URL}/MAULT-windows.exe`,
  },
  {
    platform: "linux",
    icon: IconBrandUbuntu,
    href: `${DESKTOP_DOWNLOAD_BASE_URL}/MAULT-linux.AppImage`,
  },
];

export const DESKTOP_FEATURE_ICONS = [
  IconPlayerPlay,
  IconPictureInPicture,
  IconLayoutBottombar,
  IconBell,
  IconRefresh,
];
