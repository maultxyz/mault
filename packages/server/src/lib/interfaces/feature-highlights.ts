import type {
  AdminFeatureHighlightSlideInput,
  FeatureHighlight,
  FeatureHighlightMediaType,
} from "@magic-vault/shared";

export interface SelectFeatureHighlightsOptions {
  highlights: FeatureHighlight[];
  seenHighlightIds: ReadonlySet<string>;
  includesSeenHighlights: boolean;
  now: Date;
}

export interface ObjectStorageLocation {
  endpointUrl: string;
  bucketName: string;
}

export type FeatureHighlightMediaUploadParseResult =
  | {
      success: true;
      file: File;
      contentType: string;
      mediaType: FeatureHighlightMediaType;
    }
  | { success: false; message: string };

export interface AdminFeatureHighlightRowForSelection {
  guid: string | null;
  isPublished: boolean;
  isDeleted: boolean;
  publishedAt: Date;
  slides: AdminFeatureHighlightSlideInput[];
}

export interface FeatureHighlightTimelineCursor {
  publishedMs: number;
  highlightId: string | null;
}

export interface SelectFeatureHighlightTimelinePageOptions {
  highlights: FeatureHighlight[];
  seenHighlightIds: ReadonlySet<string>;
  before: FeatureHighlightTimelineCursor | null;
  pageSize: number;
  now: Date;
}
