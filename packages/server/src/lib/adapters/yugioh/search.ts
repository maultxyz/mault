import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { YUGIOH_DEFAULT_URL } from "../../constants/urls";
import type {
  YgoCardImage,
  YgoCardPrice,
  YgoCard,
} from "../../interfaces/yugioh";

export function splitSetCode(setCode: string): { set: string; number: string } {
  const idx = setCode.lastIndexOf("-");
  if (idx <= 0) return { set: setCode, number: "" };
  return { set: setCode.slice(0, idx), number: setCode.slice(idx + 1) };
}

function resolvePrice(prices: YgoCardPrice[] | undefined): number | null {
  const p = prices?.[0];
  if (!p) return null;
  const value = Number(p.tcgplayer_price ?? p.cardmarket_price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeOne(
  raw: YgoCard,
  image: YgoCardImage | undefined,
): PlayingCard {
  const id = image ? image.id : raw.id;
  const primarySet = raw.card_sets?.[0];
  const { set, number } = primarySet
    ? splitSetCode(primarySet.set_code)
    : { set: "", number: "" };

  return {
    id: String(id),
    name: raw.name,
    image: image
      ? { small: image.image_url_small, normal: image.image_url }
      : null,
    set,
    setName: primarySet?.set_name ?? "",
    collectorNumber: number || String(id),
    rarity: (primarySet?.set_rarity ?? "").toLowerCase(),
    typeLine: raw.race ? `${raw.type} — ${raw.race}` : raw.type,
    text: raw.desc || undefined,
    power: raw.atk != null ? String(raw.atk) : undefined,
    toughness: raw.def != null ? String(raw.def) : undefined,
    colorIdentity: raw.attribute ? [raw.attribute] : [],
    artist: undefined,
    price: resolvePrice(raw.card_prices),
    priceFoil: null,
    sourceUrl: raw.ygoprodeck_url,
    cmc: raw.level ?? raw.linkval ?? raw.scale,
    raw,
  };
}

export function normalizeYugiohCard(raw: YgoCard): PlayingCard[] {
  const images = raw.card_images?.length ? raw.card_images : [undefined];
  return images.map((image) => normalizeOne(raw, image));
}

export const yugiohAdapter: CardSearchAdapter = {
  defaultUrl: YUGIOH_DEFAULT_URL,
  normalizeStored: (raw, id) =>
    normalizeYugiohCard(raw as YgoCard).find((card) => card.id === id) ?? null,
  tcgplayer: {
    categoryId: 2,
    subTypes: () => ({
      price: ["1st Edition", "Unlimited", "Limited", "Normal"],
      priceFoil: [],
    }),
    productMatch: (card) => {
      const sets = (card.raw as YgoCard).card_sets ?? [];
      return {
        numbers: sets.map((set) => set.set_code),
        accepts: () => true,
      };
    },
  },
  cardmarket: {
    gameId: 3,
    siteGamePath: "YuGiOh",
    productNames: (card) => [card.name],
  },
};
