import { cardKingdomAdapter } from "./card-kingdom";
import { csvAdapter } from "./csv";
import { manaboxAdapter } from "./manabox";
import { moxfieldAdapter } from "./moxfield";
import { tcgplayerAdapter } from "./tcgplayer";

export * from "./base";
export {
  cardKingdomAdapter,
  csvAdapter,
  manaboxAdapter,
  moxfieldAdapter,
  tcgplayerAdapter,
};

export const allExportAdapters = [
  manaboxAdapter,
  moxfieldAdapter,
  tcgplayerAdapter,
  cardKingdomAdapter,
  csvAdapter,
];
