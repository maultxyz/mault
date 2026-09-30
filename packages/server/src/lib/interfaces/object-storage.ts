export interface ParsedDataUrl {
  contentType: string;
  body: Buffer;
}

export interface StoredObject {
  key: string | null;
  dataUrl: string | null;
}
