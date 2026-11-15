import {
  SHORTENER_API_SECRET_HEADER,
  SHORTENER_INTERNAL_DELETE_LINKS_PATH,
  SHORTENER_INTERNAL_LINKS_PATH,
  SHORTENER_MAX_LINKS_PER_REQUEST,
  buildShortenerUrl,
  type Result,
  type ShortenerDeleteLinksRequest,
  type ShortenerLink,
  type ShortenerRegisterLinksRequest,
} from "@magic-vault/shared";
import {
  SHORTENER_REQUEST_TIMEOUT_MS,
  SHORTENER_SECRET_MISSING_MESSAGE,
} from "./constants/short-links";
import { getShortLinkBaseUrl, getShortenerUrl } from "./constants/urls";

function shortenerSecret(): string {
  const secret = process.env.SHORTENER_API_SECRET?.trim();
  if (!secret) throw new Error(SHORTENER_SECRET_MISSING_MESSAGE);
  return secret;
}

async function callShortener(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getShortenerUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      [SHORTENER_API_SECRET_HEADER]: shortenerSecret(),
    },
    signal: AbortSignal.timeout(SHORTENER_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Shortener ${init.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response;
}

function batchesOf<T>(items: T[]): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += SHORTENER_MAX_LINKS_PER_REQUEST) {
    batches.push(items.slice(start, start + SHORTENER_MAX_LINKS_PER_REQUEST));
  }
  return batches;
}

export async function registerShortLinks(links: ShortenerLink[]): Promise<void> {
  for (const batch of batchesOf(links)) {
    const body: ShortenerRegisterLinksRequest = { links: batch };
    await callShortener(SHORTENER_INTERNAL_LINKS_PATH, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteShortLinks(codes: string[]): Promise<void> {
  for (const batch of batchesOf(codes)) {
    const body: ShortenerDeleteLinksRequest = { codes: batch };
    await callShortener(SHORTENER_INTERNAL_DELETE_LINKS_PATH, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export async function findShortLinkTargetPath(code: string): Promise<string | null> {
  const response = await callShortener(
    `${SHORTENER_INTERNAL_LINKS_PATH}/${encodeURIComponent(code)}`,
  );
  if (response.status === 404) return null;
  const result = (await response.json()) as Result<{ targetPath: string }>;
  return result.data?.targetPath ?? null;
}

export function shortLinkUrlFor(shortCode: string): string | null {
  const baseUrl = getShortLinkBaseUrl();
  return baseUrl ? buildShortenerUrl(baseUrl, shortCode) : null;
}
