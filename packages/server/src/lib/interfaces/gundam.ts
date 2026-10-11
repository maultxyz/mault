export interface GundamCard {
  product_id: string;
  card_number: string;
  name: string;
  set_code: string;
  set_name: string;
  rarity: string;
  card_type: string;
  color: string | null;
  cost: number | null;
  ap: number | null;
  hp: number | null;
  effect: string;
  image_url: string;
  detail_url: string | null;
}

export type GundamListCard = Pick<
  GundamCard,
  "product_id" | "card_number" | "name" | "set_code" | "image_url"
>;
