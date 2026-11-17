import { isPiHost } from "../pi-host";

export const API_PORT = parseInt(process.env.PORT ?? "3001");

export function getApiHost(): string {
  return process.env.API_HOST?.trim() || (isPiHost() ? "127.0.0.1" : "0.0.0.0");
}
