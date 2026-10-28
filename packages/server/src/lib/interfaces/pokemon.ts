export interface PokemonCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface PokemonAttack {
  name: string;
  cost?: string[];
  damage?: string | number;
  effect?: string;
}

export interface PokemonAbility {
  type?: string;
  name: string;
  effect?: string;
}

export interface PokemonTcgplayerVariant {
  productId?: number;
  marketPrice?: number;
}

export interface PokemonPricing {
  tcgplayer?: {
    normal?: PokemonTcgplayerVariant;
    holofoil?: PokemonTcgplayerVariant;
    "reverse-holofoil"?: PokemonTcgplayerVariant;
    [subType: string]: PokemonTcgplayerVariant | string | undefined;
  };
  cardmarket?: {
    idProduct?: number;
  };
}

export interface PokemonCardVariant {
  type?: string;
  foil?: string;
  size?: string;
  stamp?: string[];
  thirdParty?: {
    tcgplayer?: number;
    cardmarket?: number;
  };
}

export interface PokemonFinish {
  foilType: string;
  variantType: string;
  tcgplayerProductId: number | null;
}

export interface PokemonCardDetail extends PokemonCardBrief {
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  description?: string;
  stage?: string;
  trainerType?: string;
  energyType?: string;
  effect?: string;
  attacks?: PokemonAttack[];
  abilities?: PokemonAbility[];
  retreat?: number;
  pricing?: PokemonPricing;
  variants_detailed?: PokemonCardVariant[];
  set?: {
    id: string;
    name: string;
  };
  legal?: {
    standard?: boolean;
  };
}
