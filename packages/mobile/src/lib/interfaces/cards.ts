import type { CARD_DETAIL_MENU_SHEETS } from "@/lib/constants/cards";
import type {
  CardCondition,
  CardTag,
  CollectionCardPosition,
  ExportAdapter,
  OcrOverlayRegion,
  PlayingCard,
  PlayingCardWithDistance,
  PriceSource,
  ReviewGridAttributes,
  ReviewGridCard,
  ScannedCard,
} from "@magic-vault/shared";

export type ReviewLayout = "grid" | "single";

export interface ReviewGridData {
  cards: ReviewGridCard[];
  total: number;
}

export interface ReviewGridTileProps {
  card: ReviewGridCard;
  attributes: ReviewGridAttributes;
  accepting: boolean;
  onAccept: () => void;
  onCorrect: () => void;
  onPickAttribute: (field: ReviewGridAttributeField) => void;
}

export type ReviewGridAttributeField = keyof ReviewGridAttributes;

export interface ReviewGridAttributePicker {
  card: ReviewGridCard;
  field: ReviewGridAttributeField;
}

export interface CardUpdateBody {
  card?: PlayingCardWithDistance;
  binNumber?: number;
  confirmed?: boolean;
  reviewed?: boolean;
  isFoil?: boolean;
  foilType?: string | null;
  stamp?: string | null;
  condition?: CardCondition;
  language?: string;
}

export interface CardCorrectionSearchProps {
  collectionGuid: string;
  initialQuery: string;
  inline?: boolean;
  disabled?: boolean;
  onSelect: (card: PlayingCard) => void;
}

export interface CardCorrection {
  correct: (entry: ScannedCard, card: PlayingCard) => Promise<void>;
  isPending: boolean;
}

export type CardDetailMenuSheet = (typeof CARD_DETAIL_MENU_SHEETS)[number];

export type CardDetailSheet = CardDetailMenuSheet | "actions" | "tags";

export interface MatchesOpenState {
  scanId: string;
  isOpen: boolean;
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

export interface CardPurchaseLinksProps {
  card: PlayingCard;
}

export interface CardPriceDetailsProps {
  card: PlayingCard;
  isFoil: boolean;
  foilType?: string | null;
  stamp?: string | null;
  condition?: CardCondition | null;
}

export interface PriceHeadline {
  label: string;
  price: number | null;
  foilPrice: number | null;
  priceAtScan?: number | null;
  foilPriceAtScan?: number | null;
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

export interface PricePaidFieldProps {
  label: string;
  placeholder: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export interface CardDetailPrefetchTarget {
  collectionGuid: string;
  reviewMode: boolean;
  storageGuid?: string;
}

export interface CardDetailPrefetchStep {
  collectionGuid: string;
  position: CollectionCardPosition;
  nextScanId: string | null;
}

export interface OcrRegionCropsProps {
  imageUrl: string;
  regions: OcrOverlayRegion[];
}

export interface CardDetailSkeletonProps {
  showsCapturedScan: boolean;
}

export interface SkeletonTextLineProps {
  fontSize: number;
  lineHeight: number;
  width: number | `${number}%`;
}

export interface CardTagToggle {
  tag: CardTag;
  enabled: boolean;
  isUndo?: boolean;
}
