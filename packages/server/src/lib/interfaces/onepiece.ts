export interface OptcgCard {
  card_set_id: string;
  card_name: string;
  card_image_id: string;
  card_image: string | null;
  set_id: string;
  set_name: string;
  rarity: string;
  card_type: string;
  card_color: string | null;
  card_cost: string | null;
  card_power: string | null;
  counter_amount: number | null;
  life: string | null;
  attribute: string | null;
  sub_types: string | null;
  card_text: string | null;
  market_price: number | null;
  inventory_price: number | null;
}
