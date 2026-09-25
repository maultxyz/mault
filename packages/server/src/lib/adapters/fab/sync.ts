import type { SyncSource, SyncSourceCard } from "../../card-search/sync-types";
import { withRawData } from "../../card-search/with-raw-data";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { FAB_SYNC_LOG_EVERY, FAB_SYNC_PAGE_SIZE } from "../../constants/sync";
import { FAB_DEFAULT_URL } from "../../constants/urls";
import type {
  FleshcubeCard,
  FleshcubePrinting,
  FleshcubeSearchCard,
  FleshcubeSearchResponse,
} from "../../interfaces/fleshcube";
import { fetchCardByPrintingId, fleshcubeFetch, searchUrl } from "./search";

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
      searchUrl(baseUrl, page, FAB_SYNC_PAGE_SIZE),
      signal,
    );
    if (!res.ok)
      throw new Error(`Flesh and Blood card list fetch failed: ${res.status}`);

    const json = (await res.json()) as FleshcubeSearchResponse;
    all.push(...json.results);
    addLog(`Listed ${all.length} cards so far...`);

    if (page * FAB_SYNC_PAGE_SIZE >= json.total || json.results.length === 0)
      break;
  }
  return all;
}

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

    if ((index + 1) % FAB_SYNC_LOG_EVERY === 0) {
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
