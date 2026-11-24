export interface AuthenticatedRequestInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export interface AuthenticatedResponse {
  res: Response;
  wasImpersonating: boolean;
}

export interface ApiPostFormOptions {
  timeoutMs?: number;
  reportsHttpStatus?: boolean;
}
