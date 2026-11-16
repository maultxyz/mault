import {
  DIGIMON_LANGUAGES,
  DIGIMON_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { DIGIMON_DEFAULT_URL } from "../../constants/urls";
import { createTcgtrackingCatalogSyncSource } from "../../tcgtracking/catalog-sync-source";
import { digimonCardName, digimonSetCode } from "./search";

export const digimonSyncSource = createTcgtrackingCatalogSyncSource({
  gameKey: "digimon",
  label: "Digimon Card Game (TCGTracking)",
  gameName: "Digimon",
  defaultUrl: DIGIMON_DEFAULT_URL,
  languages: DIGIMON_LANGUAGES,
  categoryId: DIGIMON_TCGPLAYER_CATEGORY_ID,
  cardName: digimonCardName,
  setCode: digimonSetCode,
});
