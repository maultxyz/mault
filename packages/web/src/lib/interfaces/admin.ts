export interface AdminCard {
  id: number;
  cardId: string;
  gameKey: string;
  lang: string;
  name: string;
  setCode: string;
  updatedAt: string;
}

export interface AdminCardsPage {
  cards: AdminCard[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncSourceInfo {
  gameKey: string;
  label: string;
  languages: string[];
}

export interface CardGameCount {
  gameKey: string;
  count: number;
}

export interface PlanLimitInputProps {
  id: string;
  label: string;
  value: number | null;
  fallback: number;
  invalid: boolean;
  onChange: (value: number | null) => void;
}
