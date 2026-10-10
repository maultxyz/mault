import type { ApiError, ApiErrorCode, ApiList } from "@magic-vault/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { getApiUrl } from "../constants/urls";
import type { PublicApiCursorPage } from "../interfaces/public-api";
import { PublicApiInputError } from "./pagination";

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  details: string,
) {
  const body: ApiError = { object: "error", code, status, details };
  return c.json(body, status);
}

export function apiErrorFrom(c: Context, err: unknown) {
  if (err instanceof PublicApiInputError) {
    return apiError(c, 400, "bad_request", err.message);
  }
  console.error(err);
  return apiError(c, 500, "internal_error", "Something went wrong.");
}

function publicRequestUrl(c: Context): URL {
  const url = new URL(c.req.url);
  const apiUrl = getApiUrl();
  if (apiUrl) {
    const base = new URL(apiUrl);
    url.protocol = base.protocol;
    url.host = base.host;
    url.pathname = `${base.pathname.replace(/\/$/, "")}${url.pathname}`;
    return url;
  }
  const proto = c.req.header("X-Forwarded-Proto")?.split(",")[0]?.trim();
  const host = c.req.header("X-Forwarded-Host")?.split(",")[0]?.trim();
  if (proto) url.protocol = `${proto}:`;
  if (host) url.host = host;
  return url;
}

export function toApiList<T>(
  c: Context,
  page: PublicApiCursorPage<T>,
): ApiList<T> {
  let nextPage: string | null = null;
  if (page.nextCursor) {
    const url = publicRequestUrl(c);
    url.searchParams.set("cursor", page.nextCursor);
    nextPage = url.toString();
  }
  return {
    object: "list",
    has_more: page.nextCursor !== null,
    next_page: nextPage,
    data: page.items,
  };
}

export function toCompleteApiList<T>(data: T[]): ApiList<T> {
  return { object: "list", has_more: false, next_page: null, data };
}

export function toPublicApiRoutePath(path: string): string {
  return path.replace(/^\/v1/, "").replace(/\{(\w+)\}/g, ":$1");
}
