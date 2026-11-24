import {
  ELESTRALS_LANGUAGES,
  ELESTRALS_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { ELESTRALS_DEFAULT_URL } from "../../constants/urls";
import { createTcgtrackingCatalogSyncSource } from "../../tcgtracking/catalog-sync-source";
import { elestralsCardName, elestralsSetCode } from "./search";

export const elestralsSyncSource = createTcgtrackingCatalogSyncSource({
  gameKey: "elestrals",
  label: "Elestrals (TCGTracking)",
  gameName: "Elestrals",
  defaultUrl: ELESTRALS_DEFAULT_URL,
  languages: ELESTRALS_LANGUAGES,
  categoryId: ELESTRALS_TCGPLAYER_CATEGORY_ID,
  cardName: elestralsCardName,
  setCode: elestralsSetCode,
});
