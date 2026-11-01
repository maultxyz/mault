import type { PlayingCard } from "@magic-vault/shared";
import { CYBERPUNK_TCGPLAYER_CATEGORY_ID } from "../../constants/card-search";
import { CYBERPUNK_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { NetdeckCard } from "../../interfaces/netdeck";
import {
  netdeckImagePath,
  netdeckMatchName,
  netdeckUrlForLang,
  selectNetdeckPrinting,
} from "../../netdeck";

const GAME = "cyberpunk";

export function normalizeCyberpunkCard(raw: NetdeckCard): PlayingCard {
  const image = netdeckImagePath(GAME, raw.slug, raw.printing_id);
  const classifications = raw.classifications.join(" ");

  return {
    id: raw.printing_id,
    name: raw.display_name,
    image: { small: image, normal: image },
    set: raw.set.code,
    setName: raw.set.name,
    collectorNumber: raw.print_number ?? "",
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine: classifications
      ? `${raw.card_type} - ${classifications}`
      : raw.card_type,
    text: raw.rules_text || undefined,
    power: raw.power != null ? String(raw.power) : undefined,
    toughness: undefined,
    colorIdentity: raw.color ? [raw.color] : [],
    artist: raw.artist || undefined,
    price: null,
    priceFoil: null,
    cmc: raw.cost ?? undefined,
    lang: raw.language,
    raw,
  };
}

export const cyberpunkAdapter: CardSearchAdapter = {
  defaultUrl: CYBERPUNK_DEFAULT_URL,
  urlForLang: (lang) => netdeckUrlForLang(CYBERPUNK_DEFAULT_URL, lang),
  normalizeStored: (raw, id) => {
    const card = selectNetdeckPrinting(raw as NetdeckCard, id);
    return card ? normalizeCyberpunkCard(card) : null;
  },
  tcgplayer: {
    categoryId: CYBERPUNK_TCGPLAYER_CATEGORY_ID,
    subTypes: () => ({ price: ["Normal", "Foil"], priceFoil: ["Foil"] }),
    productMatch: (card) => {
      const raw = card.raw as NetdeckCard;
      if (raw.language !== "en" || !raw.print_number) return null;
      const number = raw.print_number.replace(/^β/, "B");
      const name = netdeckMatchName(raw.display_name);
      return {
        numbers: [...new Set([number, number.replace(/[a-z]$/i, "")])],
        accepts: (product) => netdeckMatchName(product.name) === name,
      };
    },
  },
};
