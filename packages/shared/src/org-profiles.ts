import {
  ORG_PROFILE_HANDLE_MAX_LENGTH,
  ORG_PROFILE_HANDLE_MIN_LENGTH,
  ORG_PROFILE_HANDLE_PATTERN,
  ORG_PROFILE_PATH_PREFIX,
  RESERVED_ORG_PROFILE_HANDLES,
} from "./constants/org-profiles.constant";
import type { ShareableOrgProfile } from "./interfaces/org-profiles.interface";

const reservedOrgProfileHandles: readonly string[] = RESERVED_ORG_PROFILE_HANDLES;

export function orgProfilePath(handle: string): string {
  return `${ORG_PROFILE_PATH_PREFIX}${handle}`;
}

export function buildOrgProfileUrl(appOrigin: string, profile: ShareableOrgProfile): string {
  return profile.shortUrl ?? `${appOrigin.replace(/\/$/, "")}${orgProfilePath(profile.handle)}`;
}

export function parseOrgProfileHandleFromPath(pathSegment: string): string | null {
  const prefix = ORG_PROFILE_PATH_PREFIX.replace(/^\//, "");
  if (!pathSegment.startsWith(prefix)) return null;
  const handle = pathSegment.slice(prefix.length).toLowerCase();
  return isValidOrgProfileHandle(handle) ? handle : null;
}

export function isValidOrgProfileHandle(handle: string): boolean {
  return ORG_PROFILE_HANDLE_PATTERN.test(handle) && !reservedOrgProfileHandles.includes(handle);
}

export function suggestOrgProfileHandle(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ORG_PROFILE_HANDLE_MAX_LENGTH)
    .replace(/-+$/g, "");
  if (slug.length >= ORG_PROFILE_HANDLE_MIN_LENGTH && isValidOrgProfileHandle(slug)) return slug;
  return "";
}
