import { DELETED_ITEM_TYPES } from "@magic-vault/shared";
import type { DeletedItemTypeFilter } from "@/lib/interfaces/admin-deleted";

export const ALL_DELETED_ITEM_TYPES = "all";

export const DELETED_ITEM_TYPE_FILTERS: readonly DeletedItemTypeFilter[] = [ALL_DELETED_ITEM_TYPES, ...DELETED_ITEM_TYPES];

export const DELETED_ITEMS_PAGE_SIZE = 30;

export const DELETED_ITEMS_QUERY_KEY = ["admin", "deleted"] as const;
