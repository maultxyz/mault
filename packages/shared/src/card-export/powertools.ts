import { finishFamily } from "../card-finishes";
import {
  MOXFIELD_LANGUAGE_NAMES,
  POWERTOOLS_FINISH_FAMILY_TOKENS,
  POWERTOOLS_FINISH_PATTERN_TOKENS,
} from "../constants/card-export.constant";
import type { PlayingCardWithDistance } from "../interfaces/card.interface";
import type { ExportAdapter } from "../interfaces/card-export.interface";
import { csvEscape } from "./base";

const FINISH_PATTERN_MATCH = /\s*\(([^)]*)\)$/;
const REGULAR_FINISH_TOKEN = "Regular";

interface PowertoolsVariantDetail {
  type?: string;
  thirdParty?: { cardmarket?: number | null };
}

interface PowertoolsCardRaw {
  variants?: { firstEdition?: boolean };
  variants_detailed?: PowertoolsVariantDetail[];
  pricing?: { cardmarket?: { idProduct?: number } };
}

function compactFinishToken(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function powertoolsFinishType(isFoil: boolean, foilType: string | undefined): string {
  if (!isFoil) return REGULAR_FINISH_TOKEN;
  const family = finishFamily(foilType ?? "");
  const familyToken = POWERTOOLS_FINISH_FAMILY_TOKENS[family] ?? compactFinishToken(family);
  const pattern = foilType?.match(FINISH_PATTERN_MATCH)?.[1];
  if (!pattern) return familyToken;
  const patternToken = POWERTOOLS_FINISH_PATTERN_TOKENS[pattern] ?? compactFinishToken(pattern);
  return familyToken.startsWith("Reverse")
    ? `Reverse${patternToken}Holo`
    : `${patternToken}Holo`;
}

function powertoolsCardmarketId(
  raw: PowertoolsCardRaw | undefined,
  isFoil: boolean,
  foilType: string | undefined,
): string {
  if (!raw) return "";
  const family = isFoil ? finishFamily(foilType ?? "") : "";
  const variantType = !isFoil
    ? "normal"
    : family === "Reverse Holo"
      ? "reverse"
      : "holo";
  const variants = raw.variants_detailed ?? [];
  const match = variants.find((variant) => variant.type === variantType) ?? variants[0];
  const id = match?.thirdParty?.cardmarket ?? raw.pricing?.cardmarket?.idProduct;
  return id != null ? String(id) : "";
}

function powertoolsPrice(card: PlayingCardWithDistance, isFoil: boolean): string {
  const eur = isFoil ? (card.priceEurFoil ?? card.priceEur) : card.priceEur;
  return eur != null ? eur.toFixed(2) : "";
}

export const powertoolsAdapter: ExportAdapter = {
  key: "powertools",
  label: "Powertools",
  filenameSlug: "powertools",
  groupBy: "card-foil",
  games: ["pokemon"],
  headers: () => [
    "cardmarketId",
    "quantity",
    "name",
    "set",
    "cn",
    "condition",
    "language",
    "isFirstEd",
    "isReverseHolo",
    "isSigned",
    "price",
    "comment",
    "finishType",
    "buyPrice",
  ],
  row: ({ card, quantity, isFoil, foilType, condition, language }) => {
    const raw = card.raw as PowertoolsCardRaw | undefined;
    const finishType = powertoolsFinishType(isFoil, foilType);
    return [
      powertoolsCardmarketId(raw, isFoil, foilType),
      String(quantity),
      csvEscape(card.name),
      csvEscape(card.setName),
      card.collectorNumber.trim(),
      condition,
      MOXFIELD_LANGUAGE_NAMES[language] ?? language,
      raw?.variants?.firstEdition ? "true" : "",
      finishType.startsWith("Reverse") ? "true" : "",
      "",
      powertoolsPrice(card, isFoil),
      "",
      finishType,
      "",
    ];
  },
};
