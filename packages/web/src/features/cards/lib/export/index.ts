import { cardKingdomAdapter } from "./card-kingdom";
import { csvAdapter } from "./csv";
import { manaboxAdapter } from "./manabox";
import { moxfieldAdapter } from "./moxfield";
import { sortSwiftAdapter } from "./sort-swift";
import { tcgplayerAdapter } from "./tcgplayer";

export * from "./base";
export {
  cardKingdomAdapter,
  csvAdapter,
  manaboxAdapter,
  moxfieldAdapter,
  sortSwiftAdapter,
  tcgplayerAdapter,
};

// Every registered export format - new adapters just need adding here.
export const allExportAdapters = [
  manaboxAdapter,
  moxfieldAdapter,
  tcgplayerAdapter,
  cardKingdomAdapter,
  csvAdapter,
  sortSwiftAdapter,
];
