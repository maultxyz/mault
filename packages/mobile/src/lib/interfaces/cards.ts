import type { ReactNode } from "react";
import type { ImageProps } from "expo-image";
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
  ReviewAutoCheckOutcome,
  ReviewGridAttributes,
  ReviewGridCard,
  ScanImageSide,
  ScanDraftFormValues,
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
  onAccept: () => void;
  onCorrect: () => void;
  onPickAttribute: (field: ReviewGridAttributeField) => void;
  autoCheckOutcome?: ReviewAutoCheckOutcome;
}

export interface ReviewAutoCheckProgress {
  checked: number;
  total: number;
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
  promptAfterScanStateEdit: (editedEntry: ScannedCard) => Promise<void>;
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
  highlightColumn: number;
  format: (value: number) => string;
  missingValueLabel?: string;
}

export interface PriceSourceSection {
  source: PriceSource;
  headline: PriceHeadline;
  table: PriceTableData;
  extraTables?: PriceTableData[];
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
  showsAttributePills?: boolean;
}

export interface CardDetailTitleBlockProps {
  name: string;
  subtitle?: string | null;
  price?: number | null;
}

export interface CardImageFrameProps {
  children?: ReactNode;
}

export interface CardDetailArtProps {
  card: PlayingCard | undefined;
  caption?: string;
}

export interface CardDetailInfoSectionsProps {
  card: PlayingCard;
  gameKey?: string | null;
  lang?: string | null;
  binNumber?: number;
  isFoil: boolean;
  foilType?: string | null;
  stamp?: string | null;
  condition?: CardCondition | null;
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

export interface CardReviewAccept {
  kind: "confirm" | "review";
  acceptedScanId: string;
}

export interface CardReviewAcceptState {
  status: "idle" | "pending" | "success" | "error";
  variables: CardReviewAccept | undefined;
}

export interface CardArtImageUrls {
  normal?: string | null;
  small?: string | null;
}

export interface CardArtSources {
  imageUrl: string | null;
  placeholderUrl: string | null;
}

export type CardArtProps = Omit<ImageProps, "source" | "placeholder" | "placeholderContentFit" | "transition"> & {
  imageUrl: string | null;
  placeholderUrl?: string | null;
};

export interface CardThumbnailProps {
  imageUrl: string | null;
  placeholderUrl?: string | null;
  width?: number;
  accessibilityLabel?: string;
}

export interface ScanDraftSave {
  values: ScanDraftFormValues;
  dirtyFields: Partial<Record<keyof ScanDraftFormValues, boolean>>;
}

export type { AddCatalogCardInput } from "@magic-vault/shared";

export interface ScanImageShareRequest {
  collectionGuid: string;
  scanId: string;
  side: ScanImageSide;
  cardName: string | null | undefined;
}

export interface CardPriceHistoryRequest {
  gameKey: string;
  lang: string;
  cardId: string;
}

export interface PriceHistorySparklineProps {
  values: number[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  accessibilityLabel: string;
  accessibilityValueText: string;
}

export interface CardPriceHistoryProps {
  card: PlayingCard;
  gameKey: string;
  lang: string;
  isFoil: boolean;
}
