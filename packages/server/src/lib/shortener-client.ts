import {
  SHORTENER_API_SECRET_HEADER,
  SHORTENER_INTERNAL_CUSTOM_LINKS_PATH,
  SHORTENER_INTERNAL_DELETE_LINKS_PATH,
  SHORTENER_INTERNAL_LINKS_PATH,
  SHORTENER_MAX_LINKS_PER_REQUEST,
  buildShortenerUrl,
  type CustomShortLinkFormValues,
  type CustomShortLinkUpdateValues,
  type Result,
  type ShortenerCustomLink,
  type ShortenerDeleteLinksRequest,
  type ShortenerLink,
  type ShortenerRegisterLinksRequest,
} from "@magic-vault/shared";
import {
  SHORTENER_REQUEST_TIMEOUT_MS,
  SHORTENER_SECRET_MISSING_MESSAGE,
} from "./constants/short-links";
import { getShortLinkBaseUrl, getShortenerUrl } from "./constants/urls";

export function shortLinksEnabled(): boolean {
  return getShortLinkBaseUrl() !== null;
}

function shortenerSecret(): string {
  const secret = process.env.SHORTENER_API_SECRET?.trim();
  if (!secret) throw new Error(SHORTENER_SECRET_MISSING_MESSAGE);
  return secret;
}

async function callShortener(
  path: string,
  init: RequestInit = {},
  expectedFailureStatuses: number[] = [],
): Promise<Response> {
  const response = await fetch(`${getShortenerUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      [SHORTENER_API_SECRET_HEADER]: shortenerSecret(),
    },
    signal: AbortSignal.timeout(SHORTENER_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok && !expectedFailureStatuses.includes(response.status)) {
    throw new Error(
      `Shortener ${init.method ?? "GET"} ${getShortenerUrl()}${path} failed: ${response.status}`,
    );
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
  if (!shortLinksEnabled()) return;
  for (const batch of batchesOf(links)) {
    const body: ShortenerRegisterLinksRequest = { links: batch };
    await callShortener(SHORTENER_INTERNAL_LINKS_PATH, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteShortLinks(codes: string[]): Promise<void> {
  if (!shortLinksEnabled()) return;
  for (const batch of batchesOf(codes)) {
    const body: ShortenerDeleteLinksRequest = { codes: batch };
    await callShortener(SHORTENER_INTERNAL_DELETE_LINKS_PATH, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export async function findShortLinkTargetPath(code: string): Promise<string | null> {
  if (!shortLinksEnabled()) return null;
  const response = await callShortener(
    `${SHORTENER_INTERNAL_LINKS_PATH}/${encodeURIComponent(code)}`,
    {},
    [404],
  );
  if (response.status === 404) return null;
  const result = (await response.json()) as Result<{ targetPath: string }>;
  return result.data?.targetPath ?? null;
}

export function shortLinkUrlFor(shortCode: string): string | null {
  const baseUrl = getShortLinkBaseUrl();
  return baseUrl ? buildShortenerUrl(baseUrl, shortCode) : null;
}

export async function listCustomShortLinks(): Promise<ShortenerCustomLink[]> {
  const response = await callShortener(SHORTENER_INTERNAL_CUSTOM_LINKS_PATH);
  const result = (await response.json()) as Result<ShortenerCustomLink[]>;
  return result.data ?? [];
}

export async function createCustomShortLink(
  input: CustomShortLinkFormValues,
): Promise<ShortenerCustomLink | null> {
  const response = await callShortener(
    SHORTENER_INTERNAL_CUSTOM_LINKS_PATH,
    { method: "POST", body: JSON.stringify(input) },
    [409],
  );
  if (response.status === 409) return null;
  const result = (await response.json()) as Result<ShortenerCustomLink>;
  return result.data ?? null;
}

export async function updateCustomShortLink(
  code: string,
  input: CustomShortLinkUpdateValues,
): Promise<ShortenerCustomLink | null> {
  const response = await callShortener(
    `${SHORTENER_INTERNAL_CUSTOM_LINKS_PATH}/${encodeURIComponent(code)}`,
    { method: "PUT", body: JSON.stringify(input) },
    [404],
  );
  if (response.status === 404) return null;
  const result = (await response.json()) as Result<ShortenerCustomLink>;
  return result.data ?? null;
}

export async function deleteCustomShortLink(code: string): Promise<boolean> {
  const response = await callShortener(
    `${SHORTENER_INTERNAL_CUSTOM_LINKS_PATH}/${encodeURIComponent(code)}`,
    { method: "DELETE" },
    [404],
  );
  return response.status !== 404;
}
