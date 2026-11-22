import { BUSINESS_LIST_SEARCH_PARAM, BUSINESS_LIST_STATUS_PARAM } from "@magic-vault/shared";
import { SIDEBAR_LIST_PAGE_SIZE } from "@/lib/constants/pagination";
import type { PageRequest } from "@/lib/interfaces/pagination";

export function pageRequestParams(request: PageRequest): string {
  const params = new URLSearchParams({ limit: String(SIDEBAR_LIST_PAGE_SIZE) });
  if (request.page !== null) params.set("page", String(request.page));
  else if (request.selected) params.set("selected", request.selected);
  if (request.search) params.set(BUSINESS_LIST_SEARCH_PARAM, request.search);
  if (request.status) params.set(BUSINESS_LIST_STATUS_PARAM, request.status);
  return params.toString();
}
