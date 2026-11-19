import type { FeatureHighlight, FeatureHighlightMedia, FeatureHighlightSlide } from "@magic-vault/shared";

export interface FeatureHighlightCarouselSlide {
  key: string;
  highlightId: string;
  slide: FeatureHighlightSlide;
}

export interface FeatureHighlightsSheetProps {
  visible: boolean;
  highlights: FeatureHighlight[];
  onClose: (shownHighlightIds: string[]) => void;
  onOpenTimeline?: (shownHighlightIds: string[]) => void;
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

export interface MarkFeatureHighlightsSeenContext {
  previousData: [readonly unknown[], unknown][];
}

export interface FeatureHighlightTimelineSection {
  key: string;
  title: string;
  data: FeatureHighlight[];
}

export interface FeatureHighlightTimelineEntryProps {
  highlight: FeatureHighlight;
  isNew: boolean;
}
