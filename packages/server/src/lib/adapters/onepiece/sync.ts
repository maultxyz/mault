import { CARD_API_HEADERS } from "../card-search/constants";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import {
  dedupeOnePieceRows,
  findCardVersion,
  ONE_PIECE_DEFAULT_URL,
  onePieceSetCode,
  type OptcgCard,
} from "./search";

// Booster sets, starter decks, and promos are separate catalogs. DON!! cards
// (/allDonCards/) are deliberately not enrolled: they have no printed card id
// and no per-card endpoint, so a scan match could never resolve back to a
// card — an unrecognized DON!! simply routes to the catch-all bin.
const CATALOGS = [
  { path: "allSetCards", label: "booster sets" },
  { path: "allSTCards", label: "starter decks" },
  { path: "allPromos", label: "promos" },
];

function toSyncCard(raw: OptcgCard, id: string): SyncSourceCard {
  return {
    id,
    name: raw.card_name,
    setCode: onePieceSetCode(raw),
    imageUrl: raw.card_image ?? undefined,
  };
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  _lang?: string,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  const all: OptcgCard[] = [];

  for (const catalog of CATALOGS) {
    addLog(`Fetching One Piece ${catalog.label}...`);
    const res = await fetch(`${baseUrl}/${catalog.path}/`, {
      headers: CARD_API_HEADERS,
      signal,
    });
    if (!res.ok) {
      throw new Error(`OPTCG API ${catalog.path} fetch failed: ${res.status}`);
    }

    const rows = (await res.json()) as OptcgCard[];
    all.push(...rows);
    addLog(
      `Fetched ${catalog.label}: ${rows.length} cards (${all.length} total so far)...`,
    );
  }

  const { rows, dropped } = dedupeOnePieceRows(all);
  if (dropped.length) {
    addLog(
      `Skipped ${dropped.length} duplicate listings that could not be re-keyed.`,
    );
  }

  return rows.map(({ raw, id }) => toSyncCard(raw, id));
}

async function fetchOne(id: string, baseUrl: string) {
  const { match } = await findCardVersion(id, baseUrl);
  return match ? toSyncCard(match, id) : null;
}

export const onePieceSyncSource: SyncSource = {
  gameKey: "onepiece",
  label: "One Piece Card Game (OPTCG API)",
  defaultUrl: ONE_PIECE_DEFAULT_URL,
  fetchHeaders: CARD_API_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
