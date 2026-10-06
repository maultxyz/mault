export interface YgoCardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code?: string;
  set_price?: string;
}

export interface YgoCardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped?: string;
}

export interface YgoCardPrice {
  cardmarket_price?: string;
  tcgplayer_price?: string;
  ebay_price?: string;
  amazon_price?: string;
  coolstuffinc_price?: string;
}

export interface YgoCard {
  id: number;
  name: string;
  type: string;
  frameType?: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  scale?: number;
  linkval?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  ygoprodeck_url?: string;
  card_sets?: YgoCardSet[];
  card_images?: YgoCardImage[];
  card_prices?: YgoCardPrice[];
}

export interface YgoApiResponse {
  data?: YgoCard[];
  error?: string;
}
