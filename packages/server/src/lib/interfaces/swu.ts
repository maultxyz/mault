export interface SwuCard {
  Set: string;
  Number: string;
  Name: string;
  Subtitle?: string;
  Type: string;
  Aspects?: string[];
  Traits?: string[];
  Arenas?: string[];
  Keywords?: string[];
  cid: string;
  Cost?: string;
  Power?: string;
  HP?: string;
  FrontText?: string;
  EpicAction?: string;
  BackText?: string;
  DoubleSided: boolean;
  Rarity: string;
  Unique: boolean;
  Artist?: string;
  VariantType: string;
  MarketPrice?: string;
  FoilPrice?: string;
  LowPrice?: string;
  LowFoilPrice?: string;
  FrontArt: string;
  BackArt?: string;
  tcgplayerId?: string;
}

export interface SwuSet {
  setId: string;
  fullName: string;
  numberCards: number;
  maxElement: string;
  releaseDate?: string;
  isBaseSet?: boolean;
  parentSetId?: string;
}

export interface SwuCardList {
  total_cards: number;
  data: SwuCard[];
}
