export interface DemoCollection {
  guid: string;
  name: string;
  game: string;
  lang: string;
  cardCount: number;
}

export const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    guid: "trade-binder",
    name: "Trade Binder",
    game: "Magic: The Gathering",
    lang: "EN",
    cardCount: 214,
  },
  {
    guid: "lorcana-deck-box",
    name: "Lorcana Deck Box",
    game: "Disney Lorcana",
    lang: "EN",
    cardCount: 86,
  },
  {
    guid: "pokemon-vault",
    name: "Pokémon Vault",
    game: "Pokémon",
    lang: "EN",
    cardCount: 512,
  },
];
