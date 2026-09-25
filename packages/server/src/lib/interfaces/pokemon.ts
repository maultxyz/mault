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
  };
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
  set?: {
    id: string;
    name: string;
  };
  legal?: {
    standard?: boolean;
  };
}
