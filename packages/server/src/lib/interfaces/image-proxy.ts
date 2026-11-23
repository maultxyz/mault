export interface ProxiedImage {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
}

export interface ProxiedImageFailure {
  failureReason: string;
}
