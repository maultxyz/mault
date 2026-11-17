import {
  POKEMON_JAPAN_LANGUAGES,
  POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { POKEMON_JAPAN_DEFAULT_URL } from "../../constants/urls";
import { createTcgtrackingCatalogSyncSource } from "../../tcgtracking/catalog-sync-source";
import { pokemonJapanCardName, pokemonJapanSetCode } from "./search";

export const pokemonJapanSyncSource = createTcgtrackingCatalogSyncSource({
  gameKey: "pokemonjp",
  label: "Pokémon Japan (TCGTracking)",
  gameName: "Japanese Pokémon",
  defaultUrl: POKEMON_JAPAN_DEFAULT_URL,
  languages: POKEMON_JAPAN_LANGUAGES,
  categoryId: POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
  cardName: pokemonJapanCardName,
  setCode: pokemonJapanSetCode,
});
