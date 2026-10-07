import type { DeletedItem } from "@magic-vault/shared";
import type { Transaction } from "../../db";

export type DeletedItemRow = Omit<DeletedItem, "orgName" | "updatedAt"> & {
  updatedAt: Date;
};

export interface DeletedItemSource {
  list(): Promise<DeletedItemRow[]>;
  restore(tx: Transaction, guid: string): Promise<DeletedItemRestoreResult>;
}

export type DeletedItemRestoreResult =
  | { success: true; orgId: string | null }
  | { success: false; message: string };
