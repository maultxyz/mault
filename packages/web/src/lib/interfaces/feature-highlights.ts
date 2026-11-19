import type {
  AdminFeatureHighlight,
  FeatureHighlightSlide,
} from "@magic-vault/shared";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";

export interface WhatsNewState {
  isOpen: boolean;
  openRequestId: number;
}

export interface FeatureHighlightCarouselSlide {
  key: string;
  highlightId: string;
  slide: FeatureHighlightSlide;
}

export interface FeatureHighlightCarouselProps {
  slides: FeatureHighlightCarouselSlide[];
  onFinish: () => void;
}

export interface FeatureHighlightMediaProps {
  slide: FeatureHighlightSlide;
}

export type FeatureHighlightsPanelStatus = "loading" | "error" | "ready";

export interface FeatureHighlightsPanelProps {
  status: FeatureHighlightsPanelStatus;
  slides: FeatureHighlightCarouselSlide[];
  onDismiss: () => void;
  onRetry: () => void;
}

export interface FeatureHighlightsFloatingCardProps
  extends FeatureHighlightsPanelProps {
  movesFocusOnOpen: boolean;
}

export interface FeatureHighlightsDrawerProps
  extends FeatureHighlightsPanelProps {
  open: boolean;
}

export interface FeatureHighlightFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight: AdminFeatureHighlight | null;
  onSubmit: (values: FeatureHighlightFormValues) => Promise<boolean>;
}

export interface FeatureHighlightSlideFieldsProps {
  index: number;
  slideCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}
