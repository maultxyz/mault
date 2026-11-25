import type { ServerScanActor } from "./scan-actor";

export type PiScanApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface PiScanApiBody<T> {
  success?: boolean;
  message?: string;
  code?: string;
  data?: T;
}

export interface PiScanApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  body: PiScanApiBody<T>;
}

export interface PiScanApi {
  request<T = unknown>(
    actor: ServerScanActor,
    method: PiScanApiMethod,
    path: string,
    body?: unknown,
  ): Promise<PiScanApiResponse<T>>;
}

export interface RemotePiScanApiOptions {
  baseUrl: string;
  token: string;
}

export interface ScanActorRouteRequest {
  actor: ServerScanActor;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  signal?: AbortSignal;
}
