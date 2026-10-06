import type { DELETED_ITEM_TYPES } from "../constants/deleted-items.constant";

export type DeletedItemType = (typeof DELETED_ITEM_TYPES)[number];

export interface DeletedItem {
  type: DeletedItemType;
  guid: string;
  name: string;
  detail: string | null;
  orgId: string | null;
  orgName: string | null;
  updatedAt: string;
}
