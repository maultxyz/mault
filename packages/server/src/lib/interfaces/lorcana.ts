export interface LorcastImageUris {
  small: string;
  normal: string;
  large: string;
}

export interface LorcastCard {
  id: string;
  name: string;
  version?: string | null;
  released_at?: string;
  image_uris?: { digital: LorcastImageUris };
  cost: number;
  inkwell: boolean;
  ink: string | null;
  type: string[];
  classifications?: string[] | null;
  text?: string;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  rarity: string;
  illustrators?: string[];
  collector_number: string;
  lang: string;
  set: { id: string; code: string; name: string };
  prices?: { usd: string | number | null; usd_foil: string | number | null };
  tcgplayer_id?: number | null;
}

export interface LorcanaDeCardImages {
  thumbnail: string;
  full: string;
  foilMask?: string;
}

export interface LorcanaDeAbility {
  name: string;
  effect: string;
  fullText: string;
  type: string;
}

export interface LorcanaDeCard {
  id: number;
  name: string;
  version?: string | null;
  fullName: string;
  code: string;
  number: number;
  setCode: string;
  rarity: string;
  type: string;
  subtypes?: string[];
  subtypesText?: string;
  cost: number;
  inkwell: boolean;
  color: string;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  story?: string;
  artists?: string[];
  artistsText?: string;
  images?: LorcanaDeCardImages;
  abilities?: LorcanaDeAbility[];
  fullText?: string;
  flavorText?: string;
  externalLinks?: {
    cardmarketId?: number;
    cardmarketUrl?: string;
    tcgPlayerUrl?: string;
  };
}

export interface LorcastSet {
  id: string;
  code: string;
  name: string;
}

export interface LorcanaDeSet {
  code: string;
  name: string;
}
