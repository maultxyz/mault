import {
  GUNDAM_PRODUCT_CARD_NUMBER_TAG_PATTERN,
  POKEMON_BASIC_ENERGY_PREFIX_PATTERN,
  TCGTRACKING_MTG_COLOR_LETTERS,
} from "../constants/tcgtracking";
import type { GundamCard } from "../interfaces/gundam";
import type { TcgtrackingGameConfig } from "../interfaces/tcgtracking";
import { collectorNumberKey } from "./keys";
import {
  gundamPrimaryShape,
  onePiecePrimaryShape,
  pokemonPrimaryShape,
  riftboundPrimaryShape,
} from "./primary-shapes";

function gundamRarityKey(rarity: string | null | undefined): string {
  return (rarity ?? "").replace(/\s+/g, "").toUpperCase();
}

export const TCGTRACKING_GAMES: Record<string, TcgtrackingGameConfig> = {
  mtg: {
    numbering: "per-set",
    fallbacks: false,
    primaryCardIdOf: (product) => product.scryfall_id ?? null,
    colorIdentityOf: (colors) =>
      colors.flatMap((color) => {
        const letter = TCGTRACKING_MTG_COLOR_LETTERS[color];
        return letter ? [letter] : [];
      }),
  },
  onepiece: {
    numbering: "global",
    isBasePrinting: (card) => card.id === card.collectorNumber,
    primaryShapedFieldsOf: onePiecePrimaryShape,
    normalizesFallbackThroughPrimaryAdapter: true,
  },
  gundam: {
    numbering: "global",
    numberKeyOf: (card) => {
      const raw = card.raw as GundamCard;
      return raw.card_number ? collectorNumberKey(raw.card_number) : null;
    },
    isBasePrinting: (card) => {
      const raw = card.raw as GundamCard;
      return !raw.product_id || raw.product_id === raw.card_number;
    },
    productMatchesParallelPrinting: (card, product) => {
      const rarity = gundamRarityKey((card.raw as GundamCard).rarity);
      return rarity.includes("+") && rarity === gundamRarityKey(product.rarity);
    },
    comparableProductName: (name) =>
      name.replace(GUNDAM_PRODUCT_CARD_NUMBER_TAG_PATTERN, ""),
    primaryShapedFieldsOf: gundamPrimaryShape,
    normalizesFallbackThroughPrimaryAdapter: true,
  },
  fab: {
    numbering: "global",
    primaryShapedFieldsOf: ({ name }) => ({ card: { name } }),
  },
  pokemon: {
    numbering: "per-set",
    comparableProductName: (name) =>
      name.replace(POKEMON_BASIC_ENERGY_PREFIX_PATTERN, ""),
    primaryShapedFieldsOf: pokemonPrimaryShape,
    normalizesFallbackThroughPrimaryAdapter: true,
  },
  lorcana: {
    numbering: "per-set",
    primaryShapedFieldsOf: ({ name, collectorNumber }) => ({
      name,
      collector_number: collectorNumber,
    }),
  },
  riftbound: {
    numbering: "per-set",
    primaryShapedFieldsOf: riftboundPrimaryShape,
    normalizesFallbackThroughPrimaryAdapter: true,
  },
  swu: {
    numbering: "per-set",
    primaryShapedFieldsOf: ({ name, collectorNumber }) => ({
      Name: name,
      Number: collectorNumber,
    }),
  },
  grandarchive: {
    numbering: "per-set",
    primaryShapedFieldsOf: ({ name }) => ({ card: { name } }),
  },
  cyberpunk: {
    numbering: "per-set",
    primaryShapedFieldsOf: ({ name, collectorNumber }) => ({
      name,
      print_number: collectorNumber,
    }),
  },
  yugioh: {
    numbering: "name-only",
    primaryShapedFieldsOf: ({ name }) => ({ name }),
  },
};
