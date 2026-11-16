import type { PlayingCard } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { TCGTRACKING_FALLBACK_SOURCE } from "../../constants/tcgtracking";
import { ONE_PIECE_DEFAULT_URL } from "../../constants/urls";
import type { OptcgCard } from "../../interfaces/onepiece";
import {
  ONE_PIECE_PRINTED_ID_PATTERN as PRINTED_ID_RE,
  ONE_PIECE_PRODUCTS_WITHOUT_LANGUAGE_CODE,
  ONE_PIECE_PROMO_PRODUCT_NAME,
  ONE_PIECE_WHITESPACE_SQL_PATTERN,
  ONE_PIECE_RARE_PRINTING_NAME_SQL_PATTERN,
  ONE_PIECE_REPRINT_CARD_ID_SQL_PATTERN,
} from "../../constants/onepiece";
import { onePieceFoilPrintingVariants } from "./foil-printings";
import { onePiecePrintedId } from "./printed-id";

export { onePiecePrintedId, onePiecePrintedName } from "./printed-id";

const PRODUCT_NAME_SQL = sql`lower(trim(regexp_replace(coalesce(data->>'set_name', ''), ${ONE_PIECE_WHITESPACE_SQL_PATTERN}, ' ', 'g')))`;

const ONE_PIECE_COLORS = new Set([
  "Red",
  "Green",
  "Blue",
  "Purple",
  "Black",
  "Yellow",
]);

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

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

export function dedupeOnePieceRows(rows: OptcgCard[]): {
  rows: { raw: OptcgCard; id: string }[];
  dropped: OptcgCard[];
} {
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
      id = `${fromSetId}_${raw.card_image_id}`;
    }

    const kept = seen.get(id);
    if (!kept) {
      seen.set(id, { raw, id });
      continue;
    }
    if (!raw.card_image || kept.raw.card_image === raw.card_image) {
      continue;
    }

    const stem = imageStem(raw.card_image);
    if (stem === id) {
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
): Promise<{ match: OptcgCard | null; errorStatus?: number; urls: string[] }> {
  const printedId = onePiecePrintedId(id);
  const primary = primaryEndpoint(printedId);
  const endpoints = [primary, ...CARD_ENDPOINTS.filter((e) => e !== primary)];

  const keys = id === printedId ? [printedId] : [printedId, id];

  const urls: string[] = [];
  let errorStatus: number | undefined;
  for (const key of keys) {
    for (const endpoint of endpoints) {
      const url = `${baseUrl}/${endpoint}/${encodeURIComponent(key)}/`;
      const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });
      urls.push(`${url} [HTTP ${response.status}]`);
      if (!response.ok) {
        if (response.status !== 404) errorStatus ??= response.status;
        continue;
      }
      const data = (await response.json()) as OptcgCard[];
      if (!Array.isArray(data)) continue;

      const match =
        findVersion(data, id) ??
        (id === printedId || key === id ? data[0] : undefined);
      if (match) return { match, urls };
    }
  }

  return { match: null, errorStatus, urls };
}

export const onePieceAdapter: CardSearchAdapter = {
  defaultUrl: ONE_PIECE_DEFAULT_URL,
  normalizeStored: (raw, id) => normalizeOnePieceCard(raw as OptcgCard, id),
  rarePrintingSql: sql`(card_id ~ ${ONE_PIECE_REPRINT_CARD_ID_SQL_PATTERN} OR coalesce(data->>'card_name', '') ~* ${ONE_PIECE_RARE_PRINTING_NAME_SQL_PATTERN})`,
  printedLanguageCodeSql: sql`CASE
    WHEN (data->>'source') = ${TCGTRACKING_FALLBACK_SOURCE} THEN NULL
    WHEN ${PRODUCT_NAME_SQL} IN ('', ${ONE_PIECE_PROMO_PRODUCT_NAME}) THEN NULL
    WHEN ${PRODUCT_NAME_SQL} IN (${sql.join(
      ONE_PIECE_PRODUCTS_WITHOUT_LANGUAGE_CODE.map((name) => sql`${name}`),
      sql`, `,
    )}) THEN false
    ELSE true
  END`,
  foilPrintingVariants: onePieceFoilPrintingVariants,
  tcgplayer: {
    categoryId: 68,
    subTypes: () => ({ price: ["Normal", "Foil"], priceFoil: ["Foil"] }),
    productMatch: (card) => {
      const raw = card.raw as OptcgCard;
      const name = normalizeProductName(raw.card_name);
      return {
        numbers: [onePiecePrintedId(raw.card_image_id || raw.card_set_id)],
        accepts: (product) => normalizeProductName(product.name) === name,
      };
    },
  },
  cardmarket: {
    gameId: 18,
    siteGamePath: "OnePiece",
    productNames: (card) => {
      const raw = card.raw as OptcgCard;
      const printedId = onePiecePrintedId(raw.card_image_id || raw.card_set_id);
      return [`${raw.card_name} (${printedId})`];
    },
  },
};
