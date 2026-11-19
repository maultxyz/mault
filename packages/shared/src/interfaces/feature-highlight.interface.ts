export type FeatureHighlightSource = "release" | "admin";

export type FeatureHighlightMediaType = "image" | "video";

export type FeatureHighlightText =
  | { kind: "translated"; key: string }
  | { kind: "literal"; value: string };

export interface FeatureHighlightMedia {
  type: FeatureHighlightMediaType;
  url: string;
  posterUrl: string | null;
  altText: FeatureHighlightText;
}

export interface FeatureHighlightLink {
  url: string;
  label: FeatureHighlightText;
}

export interface FeatureHighlightSlide {
  title: FeatureHighlightText;
  body: FeatureHighlightText;
  media: FeatureHighlightMedia | null;
  link: FeatureHighlightLink | null;
}

export interface FeatureHighlight {
  id: string;
  source: FeatureHighlightSource;
  publishedAt: string;
  slides: FeatureHighlightSlide[];
}

export interface FeatureHighlightsResponse {
  highlights: FeatureHighlight[];
  seenHighlightIds: string[];
}

export interface MarkFeatureHighlightsSeenRequest {
  highlightIds: string[];
}

export interface AdminFeatureHighlightSlideInput {
  title: string;
  body: string;
  mediaType: FeatureHighlightMediaType | null;
  mediaUrl: string | null;
  mediaPosterUrl: string | null;
  mediaAltText: string;
  linkUrl: string | null;
  linkLabel: string;
}

export interface AdminFeatureHighlightInput {
  isPublished: boolean;
  publishedAt: string;
  slides: AdminFeatureHighlightSlideInput[];
}

export interface AdminFeatureHighlight extends AdminFeatureHighlightInput {
  guid: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFeatureHighlightMedia {
  url: string;
  mediaType: FeatureHighlightMediaType;
}
