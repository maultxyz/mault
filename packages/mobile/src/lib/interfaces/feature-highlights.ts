import type { FeatureHighlight, FeatureHighlightMedia, FeatureHighlightSlide, FeatureHighlightsResponse } from "@magic-vault/shared";

export type FeatureHighlightsQueryScope = "unseen" | "recent";

export interface FeatureHighlightCarouselSlide {
  key: string;
  highlightId: string;
  slide: FeatureHighlightSlide;
}

export interface FeatureHighlightsSheetProps {
  visible: boolean;
  highlights: FeatureHighlight[] | undefined;
  isLoading?: boolean;
  isLoadError?: boolean;
  isRetrying?: boolean;
  onRetryLoad?: () => void;
  onClose: (shownHighlightIds: string[]) => void;
}

export interface FeatureHighlightSlideViewProps {
  slide: FeatureHighlightSlide;
}

export interface FeatureHighlightMediaViewProps {
  media: FeatureHighlightMedia;
}

export interface FeatureHighlightStepIndicatorProps {
  currentIndex: number;
  total: number;
}

export interface FeatureHighlightsPromptProps {
  isHomeLoaded: boolean;
}

export interface FeatureHighlightsRecentSheetProps {
  visible: boolean;
  onClose: () => void;
}

export interface MarkFeatureHighlightsSeenContext {
  previousResponses: [readonly unknown[], FeatureHighlightsResponse | undefined][];
}
