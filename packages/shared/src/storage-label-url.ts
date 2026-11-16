import {
  STORAGE_LABEL_ORG_SEARCH_PARAM,
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PATH,
} from "./constants/storage-labels.constant";
import type { StorageLabelTarget } from "./interfaces/storage-labels.interface";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const STORAGE_LABEL_URL_PATTERN = new RegExp(
  `^https?://[^/?#\\s]+${STORAGE_PATH.replace(/\//g, "\\/")}/?\\?([^#\\s]*)(?:#\\S*)?$`,
);

function readQueryParam(query: string, name: string): string | null {
  const pair = query
    .split("&")
    .map((part) => part.split("="))
    .find(([key]) => key === name);
  if (!pair?.[1]) return null;
  try {
    return decodeURIComponent(pair[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
}

export function storageLabelPath(target: StorageLabelTarget): string {
  const query = [
    `${STORAGE_LOCATION_SEARCH_PARAM}=${encodeURIComponent(target.locationGuid)}`,
    `${STORAGE_LABEL_ORG_SEARCH_PARAM}=${encodeURIComponent(target.orgId)}`,
  ].join("&");
  return `${STORAGE_PATH}?${query}`;
}

export function buildStorageLabelUrl(origin: string, target: StorageLabelTarget): string {
  return `${origin.replace(/\/$/, "")}${storageLabelPath(target)}`;
}

export function buildStorageLabelQrUrl(
  origin: string,
  target: StorageLabelTarget,
  labelShortUrl: string | null | undefined,
): string {
  return labelShortUrl ?? buildStorageLabelUrl(origin, target);
}

export function parseStorageLabelUrl(text: string): StorageLabelTarget | null {
  const match = STORAGE_LABEL_URL_PATTERN.exec(text.trim());
  if (!match) return null;
  const locationGuid = readQueryParam(match[1], STORAGE_LOCATION_SEARCH_PARAM);
  const orgId = readQueryParam(match[1], STORAGE_LABEL_ORG_SEARCH_PARAM);
  if (!locationGuid || !UUID_PATTERN.test(locationGuid) || !orgId) return null;
  return { locationGuid: locationGuid.toLowerCase(), orgId };
}
