export interface RiftboundCard {
  id: string;
  name: string;
  riftbound_id: string;
  tcgplayer_id: string;
  collector_number: number;
  attributes: {
    energy?: number | null;
    might?: number | null;
    power?: number | null;
  };
  classification: {
    type: string;
    supertype?: string | null;
    rarity: string;
    domain: string[];
  };
  text: {
    rich: string;
    plain: string;
    flavour?: string | null;
  };
  set: {
    set_id: string;
    label: string;
  };
  media: {
    image_url: string;
    artist: string;
    accessibility_text: string;
  };
  tags: string[];
  orientation: string;
  metadata: {
    clean_name: string;
    updated_on: string;
    alternate_art: boolean;
    overnumbered: boolean;
    signature: boolean;
  };
  new?: boolean;
}

export interface RiftboundListResponse {
  items: RiftboundCard[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
