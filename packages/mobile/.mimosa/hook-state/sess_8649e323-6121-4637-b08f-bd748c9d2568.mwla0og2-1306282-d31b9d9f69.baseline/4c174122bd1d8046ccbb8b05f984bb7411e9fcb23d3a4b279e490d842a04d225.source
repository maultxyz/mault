import type { DeletedItem, DeletedItemType } from "@magic-vault/shared";
import type { StatusTone } from "@/lib/interfaces/theme";

export type DeletedItemTypeFilter = DeletedItemType | "all";

export interface DeletedItemsRequest {
  search: string;
  type: DeletedItemType | null;
}

export interface DeletedItemsNotice {
  tone: Extract<StatusTone, "success" | "destructive">;
  text: string;
}

export interface DeletedItemRowProps {
  item: DeletedItem;
  isRestoring: boolean;
  isRestoreDisabled: boolean;
  onRestore: (item: DeletedItem) => void;
}
