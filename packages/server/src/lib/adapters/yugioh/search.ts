import type { PlayingCard } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { YUGIOH_DEFAULT_URL } from "../../constants/urls";
import type {
  YgoCardImage,
  YgoCardPrice,
  YgoCardSet,
  YgoCard,
} from "../../interfaces/yugioh";
import {
  hasSeveralYugiohArtworks,
  mainYugiohArtworkOf,
  yugiohPrintingKey,
  yugiohPrintingOf,
} from "./printings";

export function splitSetCode(setCode: string): { set: string; number: string } {
  const idx = setCode.lastIndexOf("-");
  if (idx <= 0) return { set: setCode, number: "" };
  return { set: setCode.slice(0, idx), number: setCode.slice(idx + 1) };
}

function positivePrice(value: string | undefined): number | null {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function resolveCardPrice(prices: YgoCardPrice[] | undefined): number | null {
  const p = prices?.[0];
  if (!p) return null;
  return positivePrice(p.tcgplayer_price ?? p.cardmarket_price);
}

function isLinkedToTcgplayerProduct(raw: YgoCard): boolean {
  return typeof (raw as { tcgtrackingProductId?: unknown }).tcgtrackingProductId === "number";
}

function printingArtworkOf(raw: YgoCard): YgoCardImage | undefined {
  if (hasSeveralYugiohArtworks(raw) && isLinkedToTcgplayerProduct(raw)) {
    return undefined;
  }
  return mainYugiohArtworkOf(raw);
}

function normalizeCard(
  raw: YgoCard,
  id: string,
  printing: YgoCardSet | undefined,
  image: YgoCardImage | undefined,
  price: number | null,
): PlayingCard {
  const { set, number } = printing
    ? splitSetCode(printing.set_code)
    : { set: "", number: "" };

  return {
    id,
    name: raw.name,
    image: image
      ? { small: image.image_url_small, normal: image.image_url }
      : null,
    set,
    setName: printing?.set_name ?? "",
    collectorNumber: number || String(image?.id ?? raw.id),
    rarity: (printing?.set_rarity ?? "").toLowerCase(),
    typeLine: raw.race ? `${raw.type} — ${raw.race}` : raw.type,
    text: raw.desc || undefined,
    power: raw.atk != null ? String(raw.atk) : undefined,
    toughness: raw.def != null ? String(raw.def) : undefined,
    colorIdentity: raw.attribute ? [raw.attribute] : [],
    artist: undefined,
    price,
    priceFoil: null,
    sourceUrl: raw.ygoprodeck_url,
    cmc: raw.level ?? raw.linkval ?? raw.scale,
    raw,
  };
}

export function normalizeYugiohStored(raw: YgoCard, id: string): PlayingCard | null {
  const printing = yugiohPrintingOf(raw, id);
  if (printing) {
    return normalizeCard(
      raw,
      id,
      printing,
      printingArtworkOf(raw),
      positivePrice(printing.set_price),
    );
  }
  const firstPrinting = raw.card_sets?.[0];
  const artwork = raw.card_images?.find((image) => String(image.id) === id);
  if (artwork) {
    return normalizeCard(raw, id, firstPrinting, artwork, resolveCardPrice(raw.card_prices));
  }
  if (raw.card_images?.length) return null;
  return normalizeCard(
    raw,
    id,
    firstPrinting,
    undefined,
    firstPrinting
      ? positivePrice(firstPrinting.set_price)
      : resolveCardPrice(raw.card_prices),
  );
}

function printingOfCard(card: PlayingCard): YgoCardSet | undefined {
  const raw = card.raw as YgoCard | undefined;
  if (!raw) return undefined;
  return yugiohPrintingOf(raw, card.id) ?? raw.card_sets?.[0];
}

export function yugiohPrintingKeyOfCard(card: PlayingCard): string | null {
  const printing = printingOfCard(card);
  return printing ? yugiohPrintingKey(printing.set_code, printing.set_rarity) : null;
}

export const yugiohAdapter: CardSearchAdapter = {
  defaultUrl: YUGIOH_DEFAULT_URL,
  normalizeStored: (raw, id) => normalizeYugiohStored(raw as YgoCard, id),
  tcgplayer: {
    categoryId: 2,
    subTypes: () => ({
      price: ["1st Edition", "Unlimited", "Limited", "Normal"],
      priceFoil: [],
    }),
    productMatch: (card) => {
      const printing = printingOfCard(card);
      if (!printing) return null;
      const printingKey = yugiohPrintingKey(printing.set_code, printing.set_rarity);
      return {
        numbers: [printing.set_code],
        accepts: (product) =>
          yugiohPrintingKey(printing.set_code, product.rarity) === printingKey,
      };
    },
  },
  cardmarket: {
    gameId: 3,
    siteGamePath: "YuGiOh",
    productNames: (card) => [card.name],
  },
};
