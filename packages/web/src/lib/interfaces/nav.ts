import type { ComponentProps, ReactNode } from "react";
import type { THEME_OPTIONS } from "@/lib/constants/nav";

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

export interface MobileNavTabProps {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: boolean;
}

export interface MobileNavTabIconProps {
  icon: ReactNode;
  dot?: boolean;
  count?: number;
}

export interface MobileNavButtonProps extends ComponentProps<"button"> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badgeCount?: number;
}

export interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface MobileMenuRowProps {
  icon: ReactNode;
  label: string;
  value?: string;
  external?: boolean;
  onClick: () => void;
}

export interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: MobilePageHeaderVariant;
}

export type MobilePageHeaderVariant = "brand" | "plain";

export interface AppVersionResponse {
  success: boolean;
  data: { version: string };
}

export interface MobileSegmentedControlItem<T extends string> {
  key: T;
  label: string;
  badge?: number;
}

export interface MobileSegmentedControlProps<T extends string> {
  items: MobileSegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export interface MobileSearchInputProps extends ComponentProps<"input"> {
  placeholder: string;
}

export type ThemeOption = (typeof THEME_OPTIONS)[number];

export interface MobileTabStripProps<T extends string> {
  items: MobileSegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}
