import type { ReactNode } from "react";

export interface SettingsSectionProps {
  heading: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  dataTour?: string;
  children?: ReactNode;
}

export interface SettingsSectionsProps {
  children: ReactNode;
}

export type SettingsSectionLayout = "card" | "flat";
