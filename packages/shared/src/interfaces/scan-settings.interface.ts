import type { CardCondition } from "./card-condition.interface";
import type { Game } from "./games.interface";

export interface PersistedScanSettings {
  foilType: string | null;
  preferredSetCodes: string[];
  condition: CardCondition;
  gameKey: string | null;
}

export type ScanSettingsGame = Pick<Game, "key" | "foilTypes">;
