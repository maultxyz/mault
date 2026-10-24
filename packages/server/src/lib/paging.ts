import {
  PAGED_LIST_DEFAULT_SIZE,
  PAGED_LIST_MAX_SIZE,
} from "@magic-vault/shared";
import type { Context } from "hono";
import type { PageParams, PageWindow } from "./interfaces/paging";

export function parsePageParams(c: Context): PageParams {
  const limit = Number.parseInt(c.req.query("limit") ?? "", 10);
  const page = Number.parseInt(c.req.query("page") ?? "", 10);
  return {
    pageSize: Math.min(
      Math.max(Number.isFinite(limit) ? limit : PAGED_LIST_DEFAULT_SIZE, 1),
      PAGED_LIST_MAX_SIZE,
    ),
    page: Number.isFinite(page) && page >= 1 ? page : null,
    selected: c.req.query("selected") || null,
  };
}

export function resolvePageWindow(
  params: PageParams,
  orderedGuids: (string | null)[],
): PageWindow {
  const total = orderedGuids.length;
  const pageCount = Math.max(Math.ceil(total / params.pageSize), 1);
  const selectedIndex =
    params.page === null && params.selected
      ? orderedGuids.indexOf(params.selected)
      : -1;
  const requested =
    selectedIndex >= 0
      ? Math.floor(selectedIndex / params.pageSize) + 1
      : (params.page ?? 1);
  const page = Math.min(requested, pageCount);
  const offset = (page - 1) * params.pageSize;
  return {
    total,
    page,
    pageSize: params.pageSize,
    offset,
    guids: orderedGuids
      .slice(offset, offset + params.pageSize)
      .filter((guid): guid is string => guid !== null),
  };
}
