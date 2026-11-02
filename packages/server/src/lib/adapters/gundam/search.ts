import { type PlayingCard, proxiedImageUrl } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { GUNDAM_DEFAULT_URL } from "../../constants/urls";
import type { GundamCard } from "../../interfaces/gundam";

function parallelSuffix(productName: string): string | null {
  return /\(([A-Z]+\+)\)$/.exec(productName)?.[1] ?? null;
}

function normalizeGundamCard(raw: GundamCard): PlayingCard {
  const id = String(raw.product_id ?? raw.card_number ?? "");
  const image = raw.image_url ? proxiedImageUrl(raw.image_url) : "";
  const setCode = raw.set_code ?? "";
  const collectorNumber =
    String(raw.card_number ?? id)
      .split("-")
      .pop() ?? "";

  return {
    id,
    name: raw.name ?? "",
    image: image ? { small: image, normal: image } : null,
    set: setCode,
    setName: raw.set_name || setCode,
    collectorNumber,
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine: raw.card_type ?? "",
    text: raw.effect || undefined,
    power: raw.ap != null ? String(raw.ap) : undefined,
    toughness: raw.hp != null ? String(raw.hp) : undefined,
    colorIdentity: raw.color ? [raw.color] : [],
    artist: undefined,
    price: null,
    priceFoil: null,
    sourceUrl: raw.detail_url ?? undefined,
    cmc: typeof raw.cost === "number" ? raw.cost : undefined,
    raw,
  };
}

export const gundamAdapter: CardSearchAdapter = {
  defaultUrl: GUNDAM_DEFAULT_URL,
  normalizeStored: (raw) => normalizeGundamCard(raw as GundamCard),
  tcgplayer: {
    categoryId: 86,
    subTypes: () => ({
      price: ["Normal", "Holofoil"],
      priceFoil: ["Holofoil"],
    }),
    productMatch: (card) => {
      const raw = card.raw as GundamCard;
      const isParallel = raw.product_id !== raw.card_number;
      const rarity = (raw.rarity ?? "").replace(/\s+/g, "");
      return {
        numbers: [raw.card_number],
        accepts: (product) => {
          const suffix = parallelSuffix(product.name);
          return isParallel ? suffix === rarity : suffix === null;
        },
      };
    },
  },
  cardmarket: {
    gameId: 24,
    productNames: (card) => {
      const raw = card.raw as GundamCard;
      return [`${raw.name} (${raw.card_number})`];
    },
  },
};
