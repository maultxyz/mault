import {
  UNION_ARENA_LANGUAGES,
  UNION_ARENA_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { UNION_ARENA_DEFAULT_URL } from "../../constants/urls";
import { createTcgtrackingCatalogSyncSource } from "../../tcgtracking/catalog-sync-source";
import { unionArenaCardName, unionArenaSetCode } from "./search";

export const unionArenaSyncSource = createTcgtrackingCatalogSyncSource({
  gameKey: "unionarena",
  label: "Union Arena (TCGTracking)",
  gameName: "Union Arena",
  defaultUrl: UNION_ARENA_DEFAULT_URL,
  languages: UNION_ARENA_LANGUAGES,
  categoryId: UNION_ARENA_TCGPLAYER_CATEGORY_ID,
  cardName: unionArenaCardName,
  setCode: unionArenaSetCode,
});
