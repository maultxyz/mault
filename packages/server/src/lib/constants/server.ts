import { isPiHost } from "../pi-host";

export const API_PORT = parseInt(process.env.PORT ?? "3001");

export function getApiHost(): string {
  return process.env.API_HOST?.trim() || (isPiHost() ? "127.0.0.1" : "0.0.0.0");
}

export const PUBLIC_REQUEST_BODY_MAX_BYTES = 1024 * 1024;
export const REQUEST_BODY_MAX_BYTES = 32 * 1024 * 1024;
