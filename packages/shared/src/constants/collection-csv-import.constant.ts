import type {
  CollectionCsvFormat,
  CollectionCsvImportField,
} from "../interfaces/collection-csv-import.interface";

export const COLLECTION_CSV_IMPORT_MAX_ROWS = 5000;
export const COLLECTION_CSV_IMPORT_MAX_COPIES = 20000;
export const COLLECTION_CSV_IMPORT_QUANTITY_MAX = 999;
export const COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH = 200;
export const COLLECTION_CSV_IMPORT_UNMATCHED_ROWS_MAX = 500;
export const COLLECTION_CSV_SEPARATOR_LINE_PATTERN = /^sep=.\r?\n/i;
export const COLLECTION_CSV_ETCHED_PATTERN = /\betched\b/i;

export const COLLECTION_CSV_FORMATS: readonly CollectionCsvFormat[] = [
  {
    key: "manabox",
    label: "ManaBox",
    detectHeaders: ["set code", "scryfall id"],
    columns: {
      name: ["name"],
      setCode: ["set code"],
      setName: ["set name"],
      collectorNumber: ["collector number"],
      catalogId: ["scryfall id"],
      quantity: ["quantity"],
      foil: ["foil"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "helvault",
    label: "Helvault",
    detectHeaders: ["scryfall_id", "set_code"],
    columns: {
      name: ["name"],
      setCode: ["set_code"],
      setName: ["set_name"],
      collectorNumber: ["collector_number"],
      catalogId: ["scryfall_id"],
      quantity: ["quantity"],
      foil: ["extras"],
      language: ["language"],
    },
  },
  {
    key: "dragonShield",
    label: "Dragon Shield",
    detectHeaders: ["folder name", "card name"],
    columns: {
      name: ["card name"],
      setCode: ["set code"],
      setName: ["set name"],
      collectorNumber: ["card number"],
      quantity: ["quantity"],
      foil: ["printing"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "tcgplayerApp",
    label: "TCGplayer",
    detectHeaders: ["simple name", "product id"],
    columns: {
      name: ["simple name", "name"],
      setCode: ["set code"],
      setName: ["set"],
      collectorNumber: ["card number"],
      catalogId: ["product id"],
      quantity: ["quantity"],
      foil: ["printing"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "tcgplayerSeller",
    label: "TCGplayer (seller inventory)",
    detectHeaders: ["tcgplayer id", "product name"],
    columns: {
      name: ["product name"],
      setName: ["set name"],
      collectorNumber: ["number"],
      quantity: ["total quantity", "add to quantity"],
      condition: ["condition"],
    },
  },
  {
    key: "mault",
    label: "Mault",
    detectHeaders: ["foil type", "stamp", "card number"],
    columns: {
      name: ["name", "card name"],
      setCode: ["set"],
      setName: ["set name"],
      collectorNumber: ["card number"],
      quantity: ["quantity"],
      foil: ["foil"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "deckbox",
    label: "Deckbox",
    detectHeaders: ["count", "edition code"],
    columns: {
      name: ["name"],
      setCode: ["edition code"],
      setName: ["edition"],
      collectorNumber: ["card number"],
      quantity: ["count"],
      foil: ["foil"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "archidekt",
    label: "Archidekt",
    detectHeaders: ["quantity", "edition code"],
    columns: {
      name: ["name"],
      setCode: ["edition code"],
      setName: ["edition name"],
      collectorNumber: ["collector number"],
      catalogId: ["scryfall id"],
      quantity: ["quantity"],
      foil: ["finish", "foil"],
      condition: ["condition"],
      language: ["language"],
    },
  },
  {
    key: "moxfield",
    label: "Moxfield",
    detectHeaders: ["count", "edition"],
    columns: {
      name: ["name"],
      setCode: ["edition"],
      collectorNumber: ["collector number"],
      quantity: ["count"],
      foil: ["foil"],
      condition: ["condition"],
      language: ["language"],
    },
  },
];

export const COLLECTION_CSV_GENERIC_COLUMNS: Record<
  CollectionCsvImportField,
  readonly string[]
> = {
  name: ["name", "card name", "card", "product name", "simple name", "title"],
  setCode: ["set code", "edition code", "set_code", "setcode", "set id"],
  setName: ["set name", "edition name", "set", "edition", "expansion", "set_name"],
  collectorNumber: [
    "collector number",
    "card number",
    "collector_number",
    "number",
    "collector #",
    "card #",
    "no.",
  ],
  catalogId: ["scryfall id", "scryfall_id", "product id", "tcgplayer product id"],
  quantity: ["quantity", "count", "qty", "amount", "total quantity"],
  foil: ["foil", "finish", "printing", "foil/non-foil"],
  condition: ["condition", "cond"],
  language: ["language", "lang"],
};
