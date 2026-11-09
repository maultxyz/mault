import type { PlayingCard } from "@magic-vault/shared";
import {
  SORCERY_FOIL_TYPE_BY_FINISH,
  SORCERY_STANDARD_FINISH,
  SORCERY_TCGPLAYER_CATEGORY_ID,
  SORCERY_TCGPLAYER_SUBTYPES,
  SORCERY_TYPE_LINE_SEPARATOR,
} from "../../constants/sorcery";
import { SORCERY_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { SorceryCard } from "../../interfaces/sorcery";
import type { TcgtrackingFinishProduct } from "../../interfaces/tcgtracking";
import { sorceryArtworkId } from "./sync";

function sorceryFoilTypes(raw: SorceryCard): string[] {
  return [
    ...new Set(
      raw.printings.flatMap((printing) => SORCERY_FOIL_TYPE_BY_FINISH[printing.meta.finish] ?? []),
    ),
  ];
}

export function normalizeSorceryCard(raw: SorceryCard): PlayingCard {
  const printing = raw.printings[0];
  const { engine } = raw;
  const foilTypes = sorceryFoilTypes(raw);
  const hasStandardPrinting = raw.printings.some(
    (candidate) => candidate.meta.finish === SORCERY_STANDARD_FINISH,
  );
  return {
    id: sorceryArtworkId(printing),
    name: raw.name,
    image: null,
    set: printing.set.code,
    setName: printing.set.name,
    collectorNumber: "",
    rarity: (engine.rarity ?? "").toLowerCase(),
    typeLine: engine.subtypes.length
      ? `${engine.type}${SORCERY_TYPE_LINE_SEPARATOR}${engine.subtypes.join(" ")}`
      : engine.type,
    text: engine.rules || undefined,
    power: engine.attack != null ? String(engine.attack) : undefined,
    toughness: engine.defense != null ? String(engine.defense) : undefined,
    colorIdentity: engine.elements.filter((element) => element !== "None"),
    artist: printing.meta.artist?.name || undefined,
    price: null,
    priceFoil: null,
    cmc: engine.cost ?? undefined,
    foilTypes: foilTypes.length ? foilTypes : undefined,
    foilOnlyFoilType:
      !hasStandardPrinting && foilTypes.length === 1 ? foilTypes[0] : undefined,
    raw,
  };
}

function tcgtrackingFinishProductsOf(card: PlayingCard): TcgtrackingFinishProduct[] {
  const finishProducts = (card.raw as { tcgtrackingFinishProducts?: unknown })
    .tcgtrackingFinishProducts;
  return Array.isArray(finishProducts)
    ? (finishProducts as TcgtrackingFinishProduct[])
    : [];
}

export const sorceryAdapter: CardSearchAdapter = {
  defaultUrl: SORCERY_DEFAULT_URL,
  normalizeStored: (raw) => normalizeSorceryCard(raw as SorceryCard),
  sourceListsNonFoilPrinting: (card) =>
    (card.raw as Partial<SorceryCard> | undefined)?.printings?.some(
      (printing) => printing.meta.finish === SORCERY_STANDARD_FINISH,
    ) ?? false,
  tcgplayer: {
    categoryId: SORCERY_TCGPLAYER_CATEGORY_ID,
    subTypes: () => SORCERY_TCGPLAYER_SUBTYPES,
    finishProducts: (card) =>
      tcgtrackingFinishProductsOf(card).map((finishProduct) => ({
        ...finishProduct,
        subTypes: SORCERY_TCGPLAYER_SUBTYPES.priceFoil,
      })),
  },
};
