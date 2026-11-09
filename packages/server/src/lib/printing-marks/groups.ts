import type { PlayingCard, PrintingMarkGroups } from "@magic-vault/shared";
import { SCRYFALL_LIST_SET_CODES_WITH_ICON } from "../constants/printed-markers";
import type { FabCard, FabPrinting } from "../interfaces/fleshcube";
import type { PokemonCardDetail } from "../interfaces/pokemon";
import type { ScryfallApiCard } from "../interfaces/scryfall";

export function scryfallPrintingMarkGroups(
  card: PlayingCard,
): PrintingMarkGroups {
  const raw = card.raw as ScryfallApiCard | undefined;
  if (!raw?.set) return {};
  const frame = raw.frame ?? "";
  const border = raw.border_color ?? "";
  return {
    listIcon: SCRYFALL_LIST_SET_CODES_WITH_ICON.includes(raw.set)
      ? `list|${frame}`
      : `plain|${frame}|${border}`,
  };
}

export function fabPrintingMarkGroups(card: PlayingCard): PrintingMarkGroups {
  const raw = card.raw as
    | { card?: FabCard; printing?: FabPrinting }
    | undefined;
  if (!raw?.card || !raw.printing) return {};
  return {
    pitch: `pitch|${raw.card.pitch || "none"}`,
    editionMarker: `edition|${raw.printing.edition || "none"}`,
  };
}

export function pokemonPrintingMarkGroups(
  card: PlayingCard,
): PrintingMarkGroups {
  const raw = card.raw as PokemonCardDetail | undefined;
  if (!card.set) return {};
  return {
    setSymbol: `set|${card.set}`,
    setCodeAndRegulationMark: `set|${card.set}|${raw?.regulationMark ?? ""}`,
  };
}
