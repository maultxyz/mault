import type {
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
