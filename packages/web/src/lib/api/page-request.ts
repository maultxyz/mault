import { SIDEBAR_LIST_PAGE_SIZE } from "@/lib/constants/pagination";
import type { PageRequest } from "@/lib/interfaces/pagination";

export function pageRequestParams(request: PageRequest): string {
  const params = new URLSearchParams({ limit: String(SIDEBAR_LIST_PAGE_SIZE) });
  if (request.page !== null) params.set("page", String(request.page));
  else if (request.selected) params.set("selected", request.selected);
  return params.toString();
}
