import {
  withRawData,
  type SyncSource,
  type SyncSourceCard,
} from "../../card-search/sync-types";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { FAB_DEFAULT_URL } from "../../constants/urls";
import {
  fetchCardByPrintingId,
  fleshcubeFetch,
  searchUrl,
  type FleshcubeCard,
  type FleshcubePrinting,
  type FleshcubeSearchCard,
  type FleshcubeSearchResponse,
} from "./search";

const PAGE_SIZE = 1000;
const FULL_CARD_LOG_EVERY = 250;

function toSyncCard(
  card: FleshcubeCard,
  printing: FleshcubePrinting,
): SyncSourceCard {
  return withRawData(
    {
      id: printing.uniqueId,
      name: card.name,
      setCode: printing.setId,
      imageUrl: printing.imageUrl ?? undefined,
    },
    card,
  );
}

async function fetchCatalogSummary(
  baseUrl: string,
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<FleshcubeSearchCard[]> {
  const all: FleshcubeSearchCard[] = [];
  for (let page = 1; ; page++) {
    const res = await fleshcubeFetch(
      searchUrl(baseUrl, page, PAGE_SIZE),
      signal,
    );
    if (!res.ok)
      throw new Error(`Flesh and Blood card list fetch failed: ${res.status}`);

    const json = (await res.json()) as FleshcubeSearchResponse;
    all.push(...json.results);
    addLog(`Listed ${all.length} cards so far...`);

    if (page * PAGE_SIZE >= json.total || json.results.length === 0) break;
  }
  return all;
}

// The catalog listing is a trimmed summary, and /card/setCode omits prices,
// so the full card is fetched one card at a time from the same endpoint
// searchById uses. Each response carries every printing of that card.
async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  addLog("Fetching Flesh and Blood catalog...");
  const summary = await fetchCatalogSummary(baseUrl, addLog, signal);
  addLog(`Fetching full card data for ${summary.length} cards...`);

  const all: SyncSourceCard[] = [];
  for (const [index, { name, printings }] of summary.entries()) {
    if (signal?.aborted) throw new Error("Flesh and Blood fetch aborted");
    const firstId = printings[0]?.uniqueId;
    if (!firstId) continue;

    let card: FleshcubeCard | null = null;
    try {
      card = (await fetchCardByPrintingId(firstId, baseUrl, signal)).card;
    } catch (err) {
      if (signal?.aborted) throw err;
    }
    if (!card) {
      addLog(`Skipped ${name}: full card could not be fetched.`);
      continue;
    }

    for (const { uniqueId } of printings) {
      const printing = card.cardPrintings.find((p) => p.uniqueId === uniqueId);
      if (printing) all.push(toSyncCard(card, printing));
    }

    if ((index + 1) % FULL_CARD_LOG_EVERY === 0) {
      addLog(`Fetched ${index + 1}/${summary.length} cards...`);
    }
  }

  return all;
}

async function fetchOne(id: string, baseUrl: string) {
  const { card, url, status } = await fetchCardByPrintingId(id, baseUrl);
  const urls = [`${url} [HTTP ${status}]`];
  const printing = card?.cardPrintings.find((p) => p.uniqueId === id);
  if (!card || !printing) return { card: null, urls };
  return { card: toSyncCard(card, printing), urls };
}

export const fabSyncSource: SyncSource = {
  gameKey: "fab",
  label: "Flesh and Blood (Fleshcube)",
  defaultUrl: FAB_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
