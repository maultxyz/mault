import type { CardPurchaseLinks, PlayingCard } from "@magic-vault/shared";
import {
  CARDKINGDOM_SITE_URL,
  CARDMARKET_SITE_URL,
  TCGPLAYER_SITE_URL,
} from "../constants/urls";
import type { CardSearchAdapter } from "../interfaces/card-search";

function tcgplayerLink(
  adapter: CardSearchAdapter,
  card: PlayingCard,
  searchName: string,
): string | undefined {
  const pricing = adapter.tcgplayer;
  if (!pricing) return undefined;
  const productId = Number(
    card.tcgplayerId ??
      (card.raw != null ? pricing.productIdFromRaw?.(card) : undefined),
  );
  return Number.isInteger(productId) && productId > 0
    ? `${TCGPLAYER_SITE_URL}/product/${productId}`
    : `${TCGPLAYER_SITE_URL}/search/all/product?q=${searchName}`;
}

function cardmarketLink(
  adapter: CardSearchAdapter,
  searchName: string,
): string | undefined {
  const gamePath = adapter.cardmarket?.siteGamePath;
  if (!gamePath) return undefined;
  return `${CARDMARKET_SITE_URL}/${gamePath}/Products/Search?searchString=${searchName}`;
}

function cardKingdomLink(
  adapter: CardSearchAdapter,
  card: PlayingCard,
  searchName: string,
): string | undefined {
  const productUrl =
    card.cardKingdomPrice?.url ?? card.cardKingdomPriceFoil?.url;
  if (productUrl) return productUrl;
  if (!adapter.cardkingdom) return undefined;
  return new URL(
    `catalog/search?search=header&filter%5Bname%5D=${searchName}`,
    CARDKINGDOM_SITE_URL,
  ).toString();
}

export function purchaseLinksFor(
  adapter: CardSearchAdapter,
  card: PlayingCard,
): CardPurchaseLinks {
  const searchName = encodeURIComponent(card.name);
  const links: CardPurchaseLinks = {
    tcgplayer: tcgplayerLink(adapter, card, searchName),
    cardmarket: cardmarketLink(adapter, searchName),
    cardkingdom: cardKingdomLink(adapter, card, searchName),
  };
  return Object.fromEntries(
    Object.entries(links).filter(([, url]) => url != null),
  );
}
