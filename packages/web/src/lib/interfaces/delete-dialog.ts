import type { ReactNode } from "react";

export type DeleteConfirmMode =
  | { type: "simple" }
  | { type: "name"; name: string }
  | { type: "keyword" };

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
  confirm?: DeleteConfirmMode;
  confirmLabel?: string;
  focusConfirm?: boolean;
  onConfirm: () => void;
}
