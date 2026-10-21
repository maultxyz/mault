import type { PlayingCard, Result } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import { validateQuery } from "../../card-search/validate";
import {
  CARD_API_HEADERS,
  CYBERPUNK_TCGPLAYER_CATEGORY_ID,
  NETDECK_SEARCH_PAGE_SIZE,
} from "../../constants/card-search";
import { CYBERPUNK_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { NetdeckCard, NetdeckListResponse } from "../../interfaces/netdeck";
import {
  findNetdeckCardByPrinting,
  netdeckImagePath,
  netdeckMatchName,
  netdeckPrintingsForLang,
  netdeckUrl,
  netdeckUrlForLang,
  selectNetdeckPrinting,
  toStoredNetdeckCard,
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

export async function Search(
  query: string,
  baseUrl: string = CYBERPUNK_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const response = await fetchCardApi(
    netdeckUrl(baseUrl, { q: query, limit: NETDECK_SEARCH_PAGE_SIZE }),
    { headers: CARD_API_HEADERS },
  );

  if (!response.ok) {
    return {
      message: "Failed to fetch from the netdeck API.",
      success: false,
    };
  }

  const data = (await response.json()) as NetdeckListResponse;
  const cards = data.items.flatMap((card) =>
    netdeckPrintingsForLang(card).map((printing) =>
      normalizeCyberpunkCard(toStoredNetdeckCard(card, printing)),
    ),
  );

  if (cards.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  return {
    message: "Cards successfully retrieved.",
    data: cards,
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = CYBERPUNK_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const { card } = await findNetdeckCardByPrinting(id, baseUrl);
  const selected = card && selectNetdeckPrinting(card, id);
  if (!selected) {
    return {
      success: false,
      message: `netdeck API: no Cyberpunk printing ${id}`,
    };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeCyberpunkCard(selected),
  };
}

export const cyberpunkAdapter: CardSearchAdapter = {
  defaultUrl: CYBERPUNK_DEFAULT_URL,
  urlForLang: (lang) => netdeckUrlForLang(CYBERPUNK_DEFAULT_URL, lang),
  search: Search,
  searchById: SearchById,
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
