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
  active?: boolean;
}

export interface MobilePageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  subtitleLeading?: ReactNode;
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  collapsed?: boolean;
}

export interface MobileQuickActionProps extends ComponentProps<"button"> {
  icon: ReactNode;
  label: string;
  hint?: ReactNode;
  to?: string;
}

export interface MobileIconBadgeProps {
  children: ReactNode;
  tone?: "neutral" | "primary" | "destructive" | "warning" | "success";
  className?: string;
}

export interface MobileSectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface MobileListRowProps {
  icon?: ReactNode;
  leading?: ReactNode;
  label: string;
  description?: string;
  value?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

export interface AppVersionResponse {
  success: boolean;
  data: { version: string; piHost?: boolean };
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

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  children?: ReactNode;
}

export interface ViewTabsProps<T extends string> {
  items: MobileSegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  fill?: boolean;
  className?: string;
}

export interface PageIntroProps {
  title: string;
  description: string;
  className?: string;
}

export interface ResponsiveSegmentedProps<T extends string> {
  items: MobileSegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "default";
  className?: string;
}
