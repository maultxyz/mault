export interface ApiPostFormOptions {
  timeoutMs?: number;
  reportsHttpStatus?: boolean;
}

export interface ApiGetOptions {
  signal?: AbortSignal;
}
