import { cardKingdomAdapter } from "./card-kingdom";
import { csvAdapter } from "./csv";
import { manaboxAdapter } from "./manabox";
import { moxfieldAdapter } from "./moxfield";
import { powertoolsAdapter } from "./powertools";
import { sortswiftAdapter } from "./sortswift";
import { tcgQuickShipAdapter } from "./tcg-quick-ship";
import { tcgplayerAdapter } from "./tcgplayer";

export * from "./base";
export {
  cardKingdomAdapter,
  csvAdapter,
  manaboxAdapter,
  moxfieldAdapter,
  powertoolsAdapter,
  sortswiftAdapter,
  tcgQuickShipAdapter,
  tcgplayerAdapter,
};

export const allExportAdapters = [
  manaboxAdapter,
  moxfieldAdapter,
  tcgplayerAdapter,
  sortswiftAdapter,
  tcgQuickShipAdapter,
  cardKingdomAdapter,
  powertoolsAdapter,
  csvAdapter,
];
