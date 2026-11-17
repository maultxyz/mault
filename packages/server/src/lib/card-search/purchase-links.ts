import type { CardPurchaseLinks, PlayingCard } from "@magic-vault/shared";
import {
  CARDKINGDOM_SITE_URL,
  CARDMARKET_SITE_URL,
  TCGPLAYER_SITE_URL,
} from "../constants/urls";
import type { CardSearchAdapter } from "../interfaces/card-search";
import type { PurchaseLinkProduct } from "../interfaces/purchase-links";

function tcgplayerLink(
  adapter: CardSearchAdapter,
  product: PurchaseLinkProduct,
  searchName: string,
): string | undefined {
  if (!adapter.tcgplayer) return undefined;
  const productId = product.tcgplayerProductId;
  return productId != null && Number.isInteger(productId) && productId > 0
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
  product: PurchaseLinkProduct,
  searchName: string,
): string | undefined {
  if (product.cardKingdomUrl) return product.cardKingdomUrl;
  if (!adapter.cardkingdom) return undefined;
  return new URL(
    `catalog/search?search=header&filter%5Bname%5D=${searchName}`,
    CARDKINGDOM_SITE_URL,
  ).toString();
}

export function purchaseLinksForProduct(
  adapter: CardSearchAdapter,
  product: PurchaseLinkProduct,
): CardPurchaseLinks {
  const searchName = encodeURIComponent(product.name);
  const links: CardPurchaseLinks = {
    tcgplayer: tcgplayerLink(adapter, product, searchName),
    cardmarket: cardmarketLink(adapter, searchName),
    cardkingdom: cardKingdomLink(adapter, product, searchName),
  };
  return Object.fromEntries(
    Object.entries(links).filter(([, url]) => url != null),
  );
}

export function purchaseLinksFor(
  adapter: CardSearchAdapter,
  card: PlayingCard,
): CardPurchaseLinks {
  const productId = Number(
    card.tcgplayerId ??
      (card.raw != null
        ? adapter.tcgplayer?.productIdFromRaw?.(card)
        : undefined),
  );
  return purchaseLinksForProduct(adapter, {
    name: card.name,
    tcgplayerProductId: Number.isFinite(productId) ? productId : null,
    cardKingdomUrl:
      card.cardKingdomPrice?.url ?? card.cardKingdomPriceFoil?.url ?? null,
  });
}
