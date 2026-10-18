import { fetchCardApi } from "./card-search/fetch";
import {
  CARD_API_HEADERS,
  NETDECK_IMAGE_URL_FALLBACK_TTL_MS,
  NETDECK_IMAGE_URL_REFRESH_MARGIN_MS,
} from "./constants/card-search";
import { NETDECK_SYNC_PAGE_SIZE } from "./constants/sync";
import { NETDECK_API_ROOT } from "./constants/urls";
import type {
  NetdeckCard,
  NetdeckImageCacheEntry,
  NetdeckListResponse,
  NetdeckPrinting,
} from "./interfaces/netdeck";

const signedImageUrls = new Map<string, NetdeckImageCacheEntry>();

export function netdeckUrl(
  baseUrl: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function netdeckUrlForLang(defaultUrl: string, lang: string): string {
  return lang === "en" ? defaultUrl : netdeckUrl(defaultUrl, { language: lang });
}

export function netdeckImagePath(
  game: string,
  slug: string,
  printingId: string,
): string {
  return `/api/cards/netdeck-image/${game}/${slug}/${printingId}`;
}

export function netdeckMatchName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function withoutImageUrl<T extends { image_url?: string }>(value: T): T {
  const copy = { ...value };
  delete copy.image_url;
  return copy;
}

export function netdeckPrintingsForLang(card: NetdeckCard): NetdeckPrinting[] {
  return card.printings.filter(
    (printing) => printing.language === card.language,
  );
}

export function toStoredNetdeckCard(
  card: NetdeckCard,
  printing: NetdeckPrinting,
): NetdeckCard {
  return {
    ...withoutImageUrl(card),
    printing_id: printing.id,
    selected_printing_id: printing.id,
    set: printing.set,
    rarity: printing.rarity,
    artist: printing.artist,
    print_number: printing.collector_number,
    source_image_url: printing.source_image_url,
    printed_rules_text: printing.printed_rules_text ?? card.printed_rules_text,
    official_rules_text:
      printing.official_rules_text ?? card.official_rules_text,
    printings: card.printings.map(withoutImageUrl),
  };
}

export function selectNetdeckPrinting(
  card: NetdeckCard,
  printingId: string,
): NetdeckCard | null {
  const printing = card.printings.find((p) => p.id === printingId);
  return printing ? toStoredNetdeckCard(card, printing) : null;
}

export async function fetchNetdeckPage(
  baseUrl: string,
  offset: number,
  signal?: AbortSignal,
): Promise<NetdeckListResponse> {
  const url = netdeckUrl(baseUrl, { limit: NETDECK_SYNC_PAGE_SIZE, offset });
  const res = await fetch(url, { headers: CARD_API_HEADERS, signal });
  if (!res.ok) throw new Error(`netdeck card list fetch failed: ${res.status}`);
  return (await res.json()) as NetdeckListResponse;
}

export async function findNetdeckCardByPrinting(
  printingId: string,
  baseUrl: string,
): Promise<{ card: NetdeckCard | null; urls: string[] }> {
  const urls: string[] = [];
  let offset = 0;
  let total = 0;
  do {
    const url = netdeckUrl(baseUrl, { limit: NETDECK_SYNC_PAGE_SIZE, offset });
    const res = await fetchCardApi(url, { headers: CARD_API_HEADERS });
    urls.push(`${url} [HTTP ${res.status}]`);
    if (!res.ok) return { card: null, urls };
    const page = (await res.json()) as NetdeckListResponse;
    const card = page.items.find((c) =>
      c.printings.some((p) => p.id === printingId),
    );
    if (card) return { card, urls };
    total = page.total;
    offset += page.limit;
  } while (offset < total);
  return { card: null, urls };
}

function signedUrlExpiry(url: string): number {
  const expires = Number(new URL(url).searchParams.get("Expires"));
  return Number.isFinite(expires) && expires > 0
    ? expires * 1000
    : Date.now() + NETDECK_IMAGE_URL_FALLBACK_TTL_MS;
}

export async function netdeckSignedImageUrl(
  game: string,
  slug: string,
  printingId: string,
): Promise<string | null> {
  const key = `${game}/${slug}`;
  const cached = signedImageUrls.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.urls.get(printingId) ?? null;
  }

  const res = await fetchCardApi(`${NETDECK_API_ROOT}/cards/${game}/${slug}`, {
    headers: CARD_API_HEADERS,
  });
  if (!res.ok) return null;
  const card = (await res.json()) as NetdeckCard;

  const urls = new Map<string, string>();
  let expiresAt = Infinity;
  for (const printing of card.printings) {
    if (!printing.image_url) continue;
    urls.set(printing.id, printing.image_url);
    expiresAt = Math.min(expiresAt, signedUrlExpiry(printing.image_url));
  }
  signedImageUrls.set(key, {
    urls,
    expiresAt: Number.isFinite(expiresAt)
      ? expiresAt - NETDECK_IMAGE_URL_REFRESH_MARGIN_MS
      : Date.now() + NETDECK_IMAGE_URL_FALLBACK_TTL_MS,
  });
  return urls.get(printingId) ?? null;
}
