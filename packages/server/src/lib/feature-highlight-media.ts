import {
  FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES,
  type FeatureHighlightMediaType,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import {
  FEATURE_HIGHLIGHT_DATA_URL_PATTERN,
  FEATURE_HIGHLIGHT_MEDIA_EXTENSIONS,
  FEATURE_HIGHLIGHT_MEDIA_MAX_BYTES_BY_TYPE,
  FEATURE_HIGHLIGHT_MEDIA_STORAGE_PREFIX,
  FEATURE_HIGHLIGHT_STORED_MEDIA_KEY_PATTERN,
  FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX,
} from "./constants/feature-highlights";
import { OBJECT_STORAGE_ENABLED, SCAN_IMAGE_BUCKET } from "./constants/object-storage";
import type {
  FeatureHighlightMediaUploadParseResult,
  ObjectStorageLocation,
} from "./interfaces/feature-highlights";
import { presignObjectUrl, putObject, toDataUrl } from "./object-storage";

export function featureHighlightMediaTypeOf(
  contentType: string,
): FeatureHighlightMediaType | null {
  return (
    (FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES as Record<string, FeatureHighlightMediaType>)[
      contentType
    ] ?? null
  );
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function storedFeatureHighlightMediaKeyOf(value: string): string | null {
  if (!value.startsWith(FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX)) return null;
  const key = value.slice(FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX.length);
  return FEATURE_HIGHLIGHT_STORED_MEDIA_KEY_PATTERN.test(key) ? key : null;
}

export function toStoredFeatureHighlightMediaUrl(key: string): string {
  return `${FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX}${key}`;
}

export function featureHighlightDataUrlImageBytes(value: string): number | null {
  const match = FEATURE_HIGHLIGHT_DATA_URL_PATTERN.exec(value);
  if (!match) return null;
  const base64 = match[2];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function storageKeyFromPresignedFeatureHighlightUrl(
  value: string,
  location: ObjectStorageLocation,
): string | null {
  if (!location.endpointUrl || !location.bucketName) return null;
  try {
    const url = new URL(value);
    const endpoint = new URL(location.endpointUrl);
    if (url.origin !== endpoint.origin) return null;
    const bucketPath = `/${location.bucketName}/`;
    if (!url.pathname.startsWith(bucketPath)) return null;
    const key = decodeURIComponent(url.pathname.slice(bucketPath.length));
    return FEATURE_HIGHLIGHT_STORED_MEDIA_KEY_PATTERN.test(key) ? key : null;
  } catch {
    return null;
  }
}

function objectStorageLocation(): ObjectStorageLocation {
  return {
    endpointUrl: process.env.AWS_ENDPOINT_URL_S3 ?? "",
    bucketName: SCAN_IMAGE_BUCKET,
  };
}

export function toPersistedFeatureHighlightMediaUrl(value: string): string {
  if (!OBJECT_STORAGE_ENABLED) return value;
  const key = storageKeyFromPresignedFeatureHighlightUrl(
    value,
    objectStorageLocation(),
  );
  return key ? toStoredFeatureHighlightMediaUrl(key) : value;
}

export async function resolveFeatureHighlightMediaUrl(
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  const key = storedFeatureHighlightMediaKeyOf(value);
  if (key) return OBJECT_STORAGE_ENABLED ? presignObjectUrl(key) : null;
  if (value.startsWith(FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX)) return null;
  return value;
}

export function parseFeatureHighlightMediaUpload(
  body: Record<string, unknown>,
  isObjectStorageEnabled: boolean,
): FeatureHighlightMediaUploadParseResult {
  const file = body["file"];
  if (!(file instanceof File)) {
    return { success: false, message: "No media file provided." };
  }
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  const mediaType = featureHighlightMediaTypeOf(contentType);
  if (!mediaType) {
    return {
      success: false,
      message: "Use a PNG, JPEG, WebP or GIF image, or an MP4 or WebM video.",
    };
  }
  const maxBytes = FEATURE_HIGHLIGHT_MEDIA_MAX_BYTES_BY_TYPE[mediaType];
  if (file.size > maxBytes) {
    return {
      success: false,
      message: `${mediaType === "image" ? "Images" : "Videos"} can be at most ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    };
  }
  if (mediaType === "video" && !isObjectStorageEnabled) {
    return {
      success: false,
      message:
        "This server has no object storage, so videos can't be uploaded. Host the video elsewhere and paste its URL instead.",
    };
  }
  return { success: true, file, contentType, mediaType };
}

export async function storeFeatureHighlightMedia(
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (!OBJECT_STORAGE_ENABLED) return toDataUrl(body, contentType);
  const extension = FEATURE_HIGHLIGHT_MEDIA_EXTENSIONS[contentType];
  const key = `${FEATURE_HIGHLIGHT_MEDIA_STORAGE_PREFIX}${randomUUID()}.${extension}`;
  await putObject(key, body, contentType);
  return toStoredFeatureHighlightMediaUrl(key);
}
