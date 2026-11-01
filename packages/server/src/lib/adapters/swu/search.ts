import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { SWU_CARD_PAGE_URL, SWU_FOIL_VARIANT_TYPES } from "../../constants/swu";
import { SWU_DEFAULT_URL } from "../../constants/urls";
import type { SwuCard } from "../../interfaces/swu";

export function swuCardId(set: string, number: string): string {
  return `${set}-${number}`;
}

export function parseSwuCardId(
  id: string,
): { set: string; number: string } | null {
  const idx = id.indexOf("-");
  if (idx <= 0 || idx === id.length - 1) return null;
  return { set: id.slice(0, idx), number: id.slice(idx + 1) };
}

export function swuCardName(raw: Pick<SwuCard, "Name" | "Subtitle">): string {
  return raw.Subtitle ? `${raw.Name} - ${raw.Subtitle}` : raw.Name;
}

export function isSwuFoilVariant(raw: Pick<SwuCard, "VariantType">): boolean {
  return SWU_FOIL_VARIANT_TYPES.includes(raw.VariantType);
}

function toNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSwuCard(raw: SwuCard): PlayingCard {
  const text = [raw.FrontText, raw.EpicAction, raw.BackText]
    .filter((part): part is string => !!part)
    .join("\n\n");
  const cost = toNumber(raw.Cost);

  return {
    id: swuCardId(raw.Set, raw.Number),
    name: swuCardName(raw),
    image: raw.FrontArt ? { small: raw.FrontArt, normal: raw.FrontArt } : null,
    set: raw.Set,
    setName: raw.Set,
    collectorNumber: raw.Number,
    rarity: (raw.Rarity ?? "").toLowerCase(),
    typeLine: raw.Traits?.length
      ? `${raw.Type} - ${raw.Traits.join(", ")}`
      : raw.Type,
    text: text || undefined,
    power: raw.Power || undefined,
    toughness: raw.HP || undefined,
    colorIdentity: raw.Aspects ?? [],
    artist: raw.Artist || undefined,
    price: toNumber(raw.MarketPrice),
    priceFoil: toNumber(raw.FoilPrice),
    sourceUrl: `${SWU_CARD_PAGE_URL}/${raw.Set}/${raw.Number}`,
    tcgplayerId: raw.tcgplayerId || undefined,
    cmc: cost ?? undefined,
    raw,
  };
}

export const swuAdapter: CardSearchAdapter = {
  defaultUrl: SWU_DEFAULT_URL,
  normalizeStored: (raw) => normalizeSwuCard(raw as SwuCard),
  tcgplayer: {
    categoryId: 79,
    subTypes: () => ({ price: ["Normal", "Foil"], priceFoil: ["Foil"] }),
  },
  cardmarket: {
    gameId: 21,
    siteGamePath: "StarWarsUnlimited",
    productNames: (card) => [card.name],
  },
};
