import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { RIFTBOUND_DEFAULT_URL } from "../../constants/urls";
import type { RiftboundCard } from "../../interfaces/riftbound";

function productMatchName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function tcgplayerNumber(riftboundId: string): string | null {
  const [, number, total] = riftboundId.split("-");
  if (!number) return null;
  const printed = number.replace(/^[a-z]+/, (prefix) => prefix.toUpperCase());
  return total ? `${printed}/${total}` : printed;
}

export function normalizeRiftboundCard(raw: RiftboundCard): PlayingCard {
  const typeLine = raw.classification.supertype
    ? `${raw.classification.type} - ${raw.classification.supertype}`
    : raw.classification.type;

  return {
    id: raw.id,
    name: raw.name,
    image: raw.media?.image_url
      ? { small: raw.media.image_url, normal: raw.media.image_url }
      : null,
    set: raw.set?.set_id ?? "",
    setName: raw.set?.label ?? raw.set?.set_id ?? "",
    collectorNumber: String(raw.collector_number ?? ""),
    rarity: (raw.classification?.rarity ?? "").toLowerCase(),
    typeLine,
    text: raw.text?.plain || undefined,
    power:
      raw.attributes?.might != null ? String(raw.attributes.might) : undefined,
    toughness: undefined,
    colorIdentity: raw.classification?.domain ?? [],
    artist: raw.media?.artist || undefined,
    price: null,
    priceFoil: null,
    sourceUrl: raw.tcgplayer_id
      ? `https://www.tcgplayer.com/product/${raw.tcgplayer_id}`
      : undefined,
    tcgplayerId: raw.tcgplayer_id || undefined,
    cmc: raw.attributes?.energy ?? undefined,
    raw,
  };
}

export const riftboundAdapter: CardSearchAdapter = {
  defaultUrl: RIFTBOUND_DEFAULT_URL,
  normalizeStored: (raw) => normalizeRiftboundCard(raw as RiftboundCard),
  tcgplayer: {
    categoryId: 89,
    subTypes: () => ({ price: ["Normal", "Foil"], priceFoil: ["Foil"] }),
    productMatch: (card) => {
      const raw = card.raw as RiftboundCard;
      const number = tcgplayerNumber(raw.riftbound_id ?? "");
      if (!number) return null;
      const name = productMatchName(raw.name);
      return {
        numbers: [number],
        accepts: (product) => productMatchName(product.name).endsWith(name),
      };
    },
  },
  cardmarket: {
    gameId: 22,
    productNames: (card) => [card.name, card.name.replace(/\s*\([^)]*\)$/, "")],
  },
};
