import type { ReactNode } from "react";

export interface NavSubItemDef {
  key: string;
  to: string;
  label: string;
  badge?: boolean;
  onClick?: () => void;
}

export interface NavItemDef {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  badge?: boolean;
  desktopOnly?: boolean;
  disabled?: boolean;
  tooltip?: string;
  external?: boolean;
  subItems?: NavSubItemDef[];
}
