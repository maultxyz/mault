import { fetchCardApi } from "../card-search/fetch";
import { CARD_API_HEADERS } from "../constants/card-search";
import {
  TCGTRACKING_CATALOG_TTL_MS,
  TCGTRACKING_FALLBACK_ID_PREFIX,
  TCGTRACKING_REQUEST_DELAY_MS,
} from "../constants/tcgtracking";
import {
  TCGTRACKING_API_ROOT,
  TCGTRACKING_IMAGE_ROOT,
} from "../constants/urls";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingProduct,
  TcgtrackingSet,
} from "../interfaces/tcgtracking";

const catalogs = new Map<
  number,
  { loadedAt: number; entries: Promise<TcgtrackingCatalogEntry[]> }
>();

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchCardApi(`${TCGTRACKING_API_ROOT}${path}`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  await pause(TCGTRACKING_REQUEST_DELAY_MS);
  if (!response.ok) {
    throw new Error(`TCGTracking ${path} failed: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function slimProduct(product: TcgtrackingProduct): TcgtrackingProduct {
  return {
    id: product.id,
    name: product.name,
    number: product.number?.trim() || null,
    rarity: product.rarity ?? null,
    ext_data: product.ext_data ?? null,
    image_url: product.image_url ?? null,
    ...(product.scryfall_id ? { scryfall_id: product.scryfall_id } : {}),
  };
}

async function fetchCatalog(
  categoryId: number,
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<TcgtrackingCatalogEntry[]> {
  addLog(`Fetching TCGTracking sets for category ${categoryId}...`);
  const { sets } = await getJson<{ sets: TcgtrackingSet[] }>(
    `/${categoryId}/sets`,
    signal,
  );
  const entries: TcgtrackingCatalogEntry[] = [];
  for (const set of sets) {
    if (signal?.aborted) break;
    if (set.product_count === 0) continue;
    try {
      const { products } = await getJson<{ products: TcgtrackingProduct[] }>(
        `/${categoryId}/sets/${set.id}/cards`,
        signal,
      );
      for (const product of products) {
        entries.push({
          product: slimProduct(product),
          set: { id: set.id, name: set.name, abbreviation: set.abbreviation },
        });
      }
    } catch (err) {
      addLog(
        `TCGTracking set ${set.name} skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  addLog(
    `Fetched ${entries.length} TCGTracking cards across ${sets.length} sets.`,
  );
  return entries;
}

export function loadTcgtrackingCatalog(
  categoryId: number,
  addLog: (msg: string) => void = () => {},
  signal?: AbortSignal,
): Promise<TcgtrackingCatalogEntry[]> {
  const cached = catalogs.get(categoryId);
  if (cached && Date.now() - cached.loadedAt < TCGTRACKING_CATALOG_TTL_MS) {
    return cached.entries;
  }
  const entries = fetchCatalog(categoryId, addLog, signal);
  catalogs.clear();
  catalogs.set(categoryId, { loadedAt: Date.now(), entries });
  entries
    .then(() => {
      if (signal?.aborted) catalogs.delete(categoryId);
    })
    .catch(() => catalogs.delete(categoryId));
  return entries;
}

export function tcgtrackingImageUrl(productId: number, width: string): string {
  return `${TCGTRACKING_IMAGE_ROOT}/${productId}_${width}.jpg`;
}

export function tcgtrackingFallbackId(productId: number): string {
  return `${TCGTRACKING_FALLBACK_ID_PREFIX}${productId}`;
}

export function tcgtrackingProductIdOf(fallbackId: string): number | null {
  if (!fallbackId.startsWith(TCGTRACKING_FALLBACK_ID_PREFIX)) return null;
  const id = Number(fallbackId.slice(TCGTRACKING_FALLBACK_ID_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}
