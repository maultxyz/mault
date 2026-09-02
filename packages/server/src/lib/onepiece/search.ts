import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const ONE_PIECE_DEFAULT_URL = "https://optcgapi.com/api";

export interface OptcgCard {
  card_set_id: string;
  card_name: string;
  card_image_id: string;
  card_image: string | null;
  set_id: string;
  set_name: string;
  rarity: string;
  card_type: string;
  card_color: string | null;
  card_cost: string | null;
  card_power: string | null;
  counter_amount: number | null;
  life: string | null;
  attribute: string | null;
  sub_types: string | null;
  card_text: string | null;
  market_price: number | null;
  inventory_price: number | null;
}

const PRINTED_ID_RE = /^(?:OP|ST|EB|PRB)\d{2}-\d{3}$|^P-\d{3}$/;

const ONE_PIECE_COLORS = new Set([
  "Red",
  "Green",
  "Blue",
  "Purple",
  "Black",
  "Yellow",
]);

// Version ids usually suffix the printed id with an underscore
// ("OP01-016_p8", "OP13-118_AZWGnsD"), but the API also contains hyphenated
// typos ("OP09-078-r1") and set-prefixed ids ("EB03_OP09-034_p1"), so extract
// the first segment shaped like a printed id.
export function onePiecePrintedId(id: string): string {
  for (const segment of id.split("_")) {
    const printed = segment.replace(/-(?:pr|r|p)\d+$/, "");
    if (PRINTED_ID_RE.test(printed)) return printed;
  }
  const idx = id.indexOf("_");
  return idx > 0 ? id.slice(0, idx) : id;
}

// The printed id's prefix is the only reliable set code — the API's own
// set_id field mixes formats ("OP-01" vs "OP01", "OP14-EB04", bare "P").
export function onePieceSetCode(
  raw: Pick<OptcgCard, "card_image_id" | "card_set_id" | "set_id">,
): string {
  const printed = onePiecePrintedId(raw.card_image_id || raw.card_set_id || "");
  if (PRINTED_ID_RE.test(printed)) return printed.split("-")[0];
  return (raw.set_id ?? "").replace("-", "");
}

export function imageStem(url: string | null | undefined): string {
  if (!url) return "";
  const file = url.split("/").pop() ?? "";
  return file.replace(/\.[a-z]+$/i, "");
}

// Some printings share a card_image_id with a different image (mostly promo
// re-prints the API didn't suffix), and one corrupted record's card_set_id
// names a different card than its image id. Both sides of the app must agree
// on how those rows are re-keyed, so Search and sync share this: colliding
// rows are re-keyed by their image filename stem, prefixed with the printed id
// when the stem alone doesn't carry one — which is exactly the form
// findVersion resolves back to the row.
export function dedupeOnePieceRows(
  rows: OptcgCard[],
): { rows: { raw: OptcgCard; id: string }[]; dropped: OptcgCard[] } {
  const seen = new Map<string, { raw: OptcgCard; id: string }>();
  const dropped: OptcgCard[] = [];

  const stemKey = (collidedId: string, stem: string): string => {
    if (!stem) return "";
    if (PRINTED_ID_RE.test(onePiecePrintedId(stem))) return stem;
    return `${onePiecePrintedId(collidedId)}_${stem}`;
  };

  for (const raw of rows) {
    let id = raw.card_image_id || raw.card_set_id;
    const fromSetId = onePiecePrintedId(raw.card_set_id ?? "");
    if (
      PRINTED_ID_RE.test(fromSetId) &&
      fromSetId !== onePiecePrintedId(id) &&
      raw.card_image_id
    ) {
      // Corrupted merged record: key it under the card_set_id the per-card
      // endpoints actually group it by, keeping the image id for uniqueness.
      id = `${fromSetId}_${raw.card_image_id}`;
    }

    const kept = seen.get(id);
    if (!kept) {
      seen.set(id, { raw, id });
      continue;
    }
    if (!raw.card_image || kept.raw.card_image === raw.card_image) {
      continue; // true re-listing across catalogs
    }

    const stem = imageStem(raw.card_image);
    if (stem === id) {
      // This row's image filename IS the contested id — it is the rightful
      // owner. Move the previously kept row to its own image stem.
      const keptStem = stemKey(id, imageStem(kept.raw.card_image));
      if (keptStem && keptStem !== id && !seen.has(keptStem)) {
        seen.set(keptStem, { raw: kept.raw, id: keptStem });
        seen.set(id, { raw, id });
      } else {
        dropped.push(raw);
      }
      continue;
    }

    const stemId = stemKey(id, stem);
    if (stemId && !seen.has(stemId)) {
      seen.set(stemId, { raw, id: stemId });
    } else {
      dropped.push(raw);
    }
  }

  return { rows: [...seen.values()], dropped };
}

export function normalizeOnePieceCard(
  raw: OptcgCard,
  id: string = raw.card_image_id || raw.card_set_id,
): PlayingCard {
  const cost = raw.card_cost ? Number(raw.card_cost) : NaN;
  const printedId = onePiecePrintedId(raw.card_image_id || raw.card_set_id);

  return {
    id,
    name: raw.card_name,
    image: raw.card_image
      ? { small: raw.card_image, normal: raw.card_image }
      : null,
    set: onePieceSetCode(raw),
    setName: raw.set_name,
    collectorNumber: printedId,
    rarity: raw.rarity ?? "",
    typeLine: raw.sub_types
      ? `${raw.card_type} — ${raw.sub_types}`
      : raw.card_type,
    text: raw.card_text || undefined,
    power: raw.card_power || undefined,
    colorIdentity: raw.card_color
      ? raw.card_color.split(" ").filter((c) => ONE_PIECE_COLORS.has(c))
      : [],
    price: raw.market_price ?? null,
    priceFoil: null,
    cmc: Number.isFinite(cost) ? cost : undefined,
    raw,
  };
}

// Booster set (OPxx/EBxx/PRBxx), starter deck (STxx), and promo (P-xxx) cards
// live under different API resources, and a promo printing of a set-numbered
// card only appears under promos — so lookups try the likeliest endpoint
// first, then the others.
const CARD_ENDPOINTS = ["sets/card", "decks/card", "promos/card"] as const;

function primaryEndpoint(printedId: string): (typeof CARD_ENDPOINTS)[number] {
  if (printedId.startsWith("ST")) return "decks/card";
  if (printedId.startsWith("P-")) return "promos/card";
  return "sets/card";
}

export function findVersion(
  versions: OptcgCard[],
  id: string,
): OptcgCard | undefined {
  const printed = onePiecePrintedId(id);
  return (
    versions.find((v) => v.card_image_id === id) ??
    versions.find((v) => imageStem(v.card_image) === id) ??
    versions.find((v) => {
      const stem = imageStem(v.card_image);
      return !!stem && id === `${printed}_${stem}`;
    })
  );
}

export async function findCardVersion(
  id: string,
  baseUrl: string,
): Promise<{ match: OptcgCard | null; errorStatus?: number }> {
  const printedId = onePiecePrintedId(id);
  const primary = primaryEndpoint(printedId);
  const endpoints = [primary, ...CARD_ENDPOINTS.filter((e) => e !== primary)];

  // The per-card endpoints group rows by card_set_id, which for a few starter
  // reprints keeps the version suffix ("P-030_r1") — so when the printed id
  // misses, retry with the raw id as the path key.
  const keys = id === printedId ? [printedId] : [printedId, id];

  let errorStatus: number | undefined;
  for (const key of keys) {
    for (const endpoint of endpoints) {
      const response = await fetchCardApi(
        `${baseUrl}/${endpoint}/${encodeURIComponent(key)}/`,
        { headers: CARD_API_HEADERS },
      );
      if (!response.ok) {
        if (response.status !== 404) errorStatus ??= response.status;
        continue;
      }
      const data = (await response.json()) as OptcgCard[];
      if (!Array.isArray(data)) continue;

      const match =
        findVersion(data, id) ??
        (id === printedId || key === id ? data[0] : undefined);
      if (match) return { match };
    }
  }

  return { match: null, errorStatus };
}

const FILTERED_ENDPOINTS = [
  "sets/filtered",
  "decks/filtered",
  "promos/filtered",
];

export async function Search(
  query: string,
  baseUrl: string = ONE_PIECE_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const name = encodeURIComponent(query.trim());
  const responses = await Promise.all(
    FILTERED_ENDPOINTS.map((endpoint) =>
      fetchCardApi(`${baseUrl}/${endpoint}/?card_name=${name}`, {
        headers: CARD_API_HEADERS,
      }),
    ),
  );

  const found: OptcgCard[] = [];
  let anyOk = false;
  let errorStatus: number | undefined;
  for (const response of responses) {
    if (response.status === 404) {
      anyOk = true; // the filtered endpoints 404 on no matches
      continue;
    }
    if (!response.ok) {
      errorStatus ??= response.status;
      continue;
    }
    const data = (await response.json()) as OptcgCard[];
    if (!Array.isArray(data)) continue;
    anyOk = true;
    found.push(...data);
  }

  if (!anyOk) {
    return {
      message: "Failed to fetch from the OPTCG API.",
      success: false,
    };
  }

  // A partial fan-out must not be served (and cached) as a success.
  if (errorStatus !== undefined) {
    return {
      message: `OPTCG API error: ${errorStatus}`,
      success: false,
    };
  }

  if (found.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  const { rows } = dedupeOnePieceRows(found);

  return {
    message: "Cards successfully retrieved.",
    data: rows.map(({ raw, id }) => normalizeOnePieceCard(raw, id)),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = ONE_PIECE_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const { match, errorStatus } = await findCardVersion(id, baseUrl);

  if (!match) {
    return errorStatus
      ? {
          success: false,
          message: `OPTCG API error: ${errorStatus} for card ${id}`,
        }
      : { success: false, message: `Card ${id} not found.` };
  }

  // Keep the requested id: for re-keyed printings the row's own card_image_id
  // is the collided one, but the requested id is the identity in the app.
  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeOnePieceCard(match, id),
  };
}

export const onePieceAdapter: CardSearchAdapter = {
  defaultUrl: ONE_PIECE_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
