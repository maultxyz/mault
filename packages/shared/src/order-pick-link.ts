import {
  ORDER_BATCH_PICK_PATH,
  ORDER_PICK_LINK_MAX_ORDERS,
  ORDER_PICK_ORG_SEARCH_PARAM,
  ORDER_PICK_SEARCH_PARAM,
  ORDER_PICKS_PATH,
} from "./constants/business.constant";
import type { OrderPickLinkTarget } from "./interfaces/business.interface";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const escapePath = (path: string) => path.replace(/\//g, "\\/");

const ORDER_PICK_URL_PATTERN = new RegExp(
  `^https?://[^/?#\\s]+(?:${escapePath(ORDER_BATCH_PICK_PATH)}|${escapePath(ORDER_PICKS_PATH)})/?\\?([^#\\s]*)(?:#\\S*)?$`,
);

function readQueryParams(query: string, name: string): string[] {
  return query
    .split("&")
    .map((part) => part.split("="))
    .filter(([key, value]) => key === name && !!value)
    .flatMap(([, value]) => {
      try {
        return [decodeURIComponent(value.replace(/\+/g, " "))];
      } catch {
        return [];
      }
    });
}

export function buildOrderPickUrl(origin: string, target: OrderPickLinkTarget): string {
  const path = target.orderGuids.length === 1 ? ORDER_PICKS_PATH : ORDER_BATCH_PICK_PATH;
  const query = [
    ...target.orderGuids.map((orderGuid) => `${ORDER_PICK_SEARCH_PARAM}=${encodeURIComponent(orderGuid)}`),
    ...(target.orgId ? [`${ORDER_PICK_ORG_SEARCH_PARAM}=${encodeURIComponent(target.orgId)}`] : []),
  ].join("&");
  return `${origin.replace(/\/$/, "")}${path}?${query}`;
}

export function parseOrderPickUrl(text: string): OrderPickLinkTarget | null {
  const match = ORDER_PICK_URL_PATTERN.exec(text.trim());
  if (!match) return null;
  const orderGuids = [
    ...new Set(
      readQueryParams(match[1], ORDER_PICK_SEARCH_PARAM)
        .filter((orderGuid) => UUID_PATTERN.test(orderGuid))
        .map((orderGuid) => orderGuid.toLowerCase()),
    ),
  ].slice(0, ORDER_PICK_LINK_MAX_ORDERS);
  if (orderGuids.length === 0) return null;
  const orgId = readQueryParams(match[1], ORDER_PICK_ORG_SEARCH_PARAM)[0] ?? null;
  return { orderGuids, orgId };
}
