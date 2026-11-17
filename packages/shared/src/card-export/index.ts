import { cardKingdomAdapter } from "./card-kingdom";
import { csvAdapter } from "./csv";
import { manaboxAdapter } from "./manabox";
import { moxfieldAdapter } from "./moxfield";
import { powertoolsAdapter } from "./powertools";
import { sortswiftAdapter } from "./sortswift";
import { tcgplayerAdapter } from "./tcgplayer";

export * from "./base";
export {
  cardKingdomAdapter,
  csvAdapter,
  manaboxAdapter,
  moxfieldAdapter,
  powertoolsAdapter,
  sortswiftAdapter,
  tcgplayerAdapter,
};

export const allExportAdapters = [
  manaboxAdapter,
  moxfieldAdapter,
  tcgplayerAdapter,
  sortswiftAdapter,
  cardKingdomAdapter,
  powertoolsAdapter,
  csvAdapter,
];
