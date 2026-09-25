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

export interface SectionNavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

export interface SectionNavProps {
  title: string;
  subtitle: string;
  items: SectionNavItem[];
  className?: string;
  "data-tour"?: string;
}
