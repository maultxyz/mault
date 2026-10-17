import type {
  CardCondition,
  ExportAdapter,
  PlayingCard,
  PlayingCardWithDistance,
  PriceSource,
  ScannedCard,
} from "@magic-vault/shared";

export interface CardUpdateBody {
  card?: PlayingCardWithDistance;
  binNumber?: number;
  confirmed?: boolean;
  reviewed?: boolean;
  isFoil?: boolean;
  foilType?: string | null;
  condition?: CardCondition;
}

export interface CardCorrectionSearchProps {
  collectionGuid: string;
  initialQuery: string;
  disabled?: boolean;
  onSelect: (card: PlayingCard) => void;
}

export interface CardCorrection {
  correct: (entry: ScannedCard, card: PlayingCard) => Promise<void>;
  isPending: boolean;
}

export interface CandidateStripProps {
  candidates: PlayingCard[];
  selectedId: string | undefined;
  onSelect: (card: PlayingCard) => void;
  disabled?: boolean;
}

export interface BinLocationDiagramProps {
  binNumber: number;
}

export interface CardPriceDetailsProps {
  card: PlayingCard;
  isFoil: boolean;
}

export interface PriceHeadline {
  label: string;
  price: number | null;
  foilPrice: number | null;
  format: (value: number) => string;
}

export interface PriceTableRow {
  label: string;
  values: (number | null)[];
}

export interface PriceTableData {
  heading: string;
  columns: string[];
  rows: PriceTableRow[];
  printings: number;
  highlightColumn: number;
  format: (value: number) => string;
}

export interface PriceSourceSection {
  source: PriceSource;
  headline: PriceHeadline;
  table: PriceTableData;
}

export interface ExportSheetProps {
  visible: boolean;
  title: string;
  adapters: ExportAdapter[];
  loading: boolean;
  exporting: boolean;
  failed: boolean;
  combineDuplicates: boolean;
  onCombineDuplicatesChange: (value: boolean) => void;
  onExport: (adapter: ExportAdapter) => void;
  onClose: () => void;
}
