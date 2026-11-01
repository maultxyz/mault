import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import {
  LORCANA_DE_DEFAULT_URL,
  LORCANA_DEFAULT_URL,
} from "../../constants/urls";
import type {
  LorcastCard,
  LorcanaDeCard,
} from "../../interfaces/lorcana";

export function lorcanaCardId(
  setCode: string,
  collectorNumber: string,
): string {
  return `${setCode}-${collectorNumber}`;
}

export function parseLorcanaCardId(
  id: string,
): { setCode: string; number: string } | null {
  const idx = id.indexOf("-");
  if (idx <= 0 || idx === id.length - 1) return null;
  return { setCode: id.slice(0, idx), number: id.slice(idx + 1) };
}

export function lorcanaCardName(raw: {
  name: string;
  version?: string | null;
}): string {
  return raw.version ? `${raw.name} - ${raw.version}` : raw.name;
}

export function normalizeLorcanaCard(raw: LorcastCard): PlayingCard {
  const image = raw.image_uris?.digital;

  return {
    id: lorcanaCardId(raw.set.code, raw.collector_number),
    name: lorcanaCardName(raw),
    image: image ? { small: image.small, normal: image.normal } : null,
    set: raw.set.code,
    setName: raw.set.name,
    collectorNumber: raw.collector_number,
    rarity: (raw.rarity ?? "").toLowerCase().replace(/_/g, " "),
    typeLine: raw.classifications?.length
      ? `${raw.type.join(" ")} — ${raw.classifications.join(", ")}`
      : raw.type.join(" "),
    text: raw.text || undefined,
    power: raw.strength != null ? String(raw.strength) : undefined,
    toughness: raw.willpower != null ? String(raw.willpower) : undefined,
    colorIdentity: raw.ink ? [raw.ink] : [],
    artist: raw.illustrators?.length ? raw.illustrators.join(", ") : undefined,
    price: raw.prices?.usd != null ? Number(raw.prices.usd) : null,
    priceFoil:
      raw.prices?.usd_foil != null ? Number(raw.prices.usd_foil) : null,
    tcgplayerId:
      raw.tcgplayer_id != null ? String(raw.tcgplayer_id) : undefined,
    cmc: raw.cost,
    raw,
  };
}

function tcgplayerIdFromUrl(url: string | undefined): string | undefined {
  return url?.match(/\/product\/(\d+)/)?.[1];
}

export function lorcanaDeCardName(raw: LorcanaDeCard): string {
  return raw.fullName || raw.name;
}

export function normalizeLorcanaDeCard(raw: LorcanaDeCard): PlayingCard {
  const typeLine = raw.subtypesText
    ? `${raw.type} — ${raw.subtypesText}`
    : raw.type;

  return {
    id: String(raw.id),
    name: lorcanaDeCardName(raw),
    image: raw.images
      ? { small: raw.images.thumbnail, normal: raw.images.full }
      : null,
    set: raw.setCode,
    setName: raw.setCode,
    collectorNumber: raw.code,
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine,
    text:
      raw.fullText ||
      raw.abilities?.map((a) => a.fullText).join("\n\n") ||
      undefined,
    power: raw.strength != null ? String(raw.strength) : undefined,
    toughness: raw.willpower != null ? String(raw.willpower) : undefined,
    colorIdentity: raw.color ? [raw.color] : [],
    artist: raw.artistsText || raw.artists?.join(", "),
    price: null,
    priceFoil: null,
    sourceUrl: raw.externalLinks?.cardmarketUrl,
    tcgplayerId: tcgplayerIdFromUrl(raw.externalLinks?.tcgPlayerUrl),
    cmc: raw.cost,
    raw,
  };
}

export const lorcanaAdapter: CardSearchAdapter = {
  defaultUrl: LORCANA_DEFAULT_URL,
  urlForLang: (lang) =>
    lang === "de" ? LORCANA_DE_DEFAULT_URL : LORCANA_DEFAULT_URL,
  normalizeStored: (raw, _id, lang) =>
    lang === "de"
      ? normalizeLorcanaDeCard(raw as LorcanaDeCard)
      : normalizeLorcanaCard(raw as LorcastCard),
  tcgplayer: {
    categoryId: 71,
    subTypes: () => ({
      price: ["Normal", "Holofoil", "Cold Foil"],
      priceFoil: ["Holofoil", "Cold Foil"],
    }),
  },
  cardmarket: {
    gameId: 19,
    siteGamePath: "Lorcana",
    productIdFromRaw: (card) =>
      (card.raw as LorcanaDeCard).externalLinks?.cardmarketId,
    productNames: (card) => [card.name],
  },
};
