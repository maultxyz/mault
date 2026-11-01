import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { SCRYFALL_LIST_SET_CODES } from "../../constants/card-search";
import { sql } from "drizzle-orm";
import { SCRYFALL_DEFAULT_URL } from "../../constants/urls";
import { scryfallFoilPrintingVariants } from "./foil-printings";
import type {
  ScryfallApiCard,
} from "../../interfaces/scryfall";

function withPrintedFields(raw: ScryfallApiCard): ScryfallApiCard {
  const face = raw.card_faces?.[0];
  return {
    ...raw,
    name: raw.printed_name ?? face?.printed_name ?? face?.name ?? raw.name,
    type_line: raw.printed_type_line ?? raw.type_line,
    oracle_text:
      raw.printed_text ??
      face?.printed_text ??
      raw.oracle_text ??
      face?.oracle_text,
  };
}

function parsePrice(value: string | null | undefined): number | null {
  return value != null ? Number.parseFloat(value) : null;
}

function normalizeScryfallCard(rawInput: ScryfallApiCard): PlayingCard {
  const raw = withPrintedFields(rawInput);
  const face = raw.card_faces?.[0];
  const imageUris = raw.image_uris ?? face?.image_uris;

  return {
    id: raw.id,
    name: raw.name,
    image: imageUris
      ? { small: imageUris.small, normal: imageUris.normal }
      : null,
    set: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    rarity: raw.rarity,
    typeLine: raw.type_line,
    text: raw.oracle_text,
    manaCost: raw.mana_cost ?? face?.mana_cost,
    power: raw.power ?? face?.power,
    toughness: raw.toughness ?? face?.toughness,
    colorIdentity: raw.color_identity,
    artist: raw.artist ?? face?.artist,
    price: parsePrice(raw.prices.usd),
    priceFoil: parsePrice(raw.prices.usd_foil ?? raw.prices.usd_etched),
    sourceUrl: raw.scryfall_uri,
    tcgplayerId:
      raw.tcgplayer_id != null ? String(raw.tcgplayer_id) : undefined,
    cmc: raw.cmc,
    raw,
  };
}

export const scryfallAdapter: CardSearchAdapter = {
  defaultUrl: SCRYFALL_DEFAULT_URL,
  normalizeStored: (raw) => normalizeScryfallCard(raw as ScryfallApiCard),
  rarePrintingSql: sql`((data->>'promo') = 'true' OR lower(set_code) IN (${sql.join(
    SCRYFALL_LIST_SET_CODES.map((code) => sql`${code}`),
    sql`, `,
  )}))`,
  excludedFromMatchingSql: sql`(data->>'digital') = 'true'`,
  foilPrintingVariants: scryfallFoilPrintingVariants,
  tcgplayer: {
    categoryId: 1,
    subTypes: () => ({ price: ["Normal"], priceFoil: ["Foil"] }),
    productIdFromRaw: (card) => (card.raw as ScryfallApiCard).tcgplayer_id,
  },
  cardmarket: {
    gameId: 1,
    siteGamePath: "Magic",
    productIdFromRaw: (card) => (card.raw as ScryfallApiCard).cardmarket_id,
  },
  cardkingdom: {
    scryfallIdFromRaw: (card) => (card.raw as ScryfallApiCard | undefined)?.id,
  },
};
