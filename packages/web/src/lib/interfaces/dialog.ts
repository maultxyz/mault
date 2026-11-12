import type { ReactNode } from "react";

export type DialogPresentation = "dialog" | "drawer";

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  drawerOnMobile?: boolean;
  dismissible?: boolean;
  children?: ReactNode;
}
