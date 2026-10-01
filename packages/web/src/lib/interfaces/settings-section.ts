import type { ReactNode } from "react";

export interface SettingsSectionProps {
  heading: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

export interface SettingsSectionsProps {
  children: ReactNode;
}
