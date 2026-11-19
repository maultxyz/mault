import type {
  AdminFeatureHighlight,
  FeatureHighlight,
  FeatureHighlightLink,
  FeatureHighlightSlide,
} from "@magic-vault/shared";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";

export interface FeatureHighlightCarouselSlide {
  key: string;
  highlightId: string;
  slide: FeatureHighlightSlide;
}

export interface FeatureHighlightCarouselProps {
  slides: FeatureHighlightCarouselSlide[];
  onFinish: () => void;
  slideIndex?: number;
  onSlideIndexChange?: (slideIndex: number) => void;
  openHrefOf?: (slide: FeatureHighlightCarouselSlide) => string;
  onOpenSlide?: (slide: FeatureHighlightCarouselSlide) => void;
}

export interface FeatureHighlightMediaProps {
  slide: FeatureHighlightSlide;
  allowsAutoplay: boolean;
}

export interface FeatureHighlightLinkButtonProps {
  link: FeatureHighlightLink;
}

export interface FeatureHighlightsFloatingCardProps {
  slides: FeatureHighlightCarouselSlide[];
  onDismiss: () => void;
  onOpenTimeline: () => void;
}

export interface FeatureHighlightsDrawerProps {
  open: boolean;
  slides: FeatureHighlightCarouselSlide[];
  onDismiss: () => void;
  onOpenTimeline: () => void;
}

export interface FeatureHighlightMonthGroup {
  key: string;
  monthStart: Date;
  highlights: FeatureHighlight[];
}

export interface FeatureHighlightTimelineEntryProps {
  highlight: FeatureHighlight;
  isNew: boolean;
  isEmphasized: boolean;
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

export interface FeatureHighlightCompactEntryProps {
  highlight: FeatureHighlight;
  isNew: boolean;
}

export interface FeatureHighlightSearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
}

export interface FeatureHighlightTimelineProps {
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
  searchQuery: string;
}
