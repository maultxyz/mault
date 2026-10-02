import type { ComponentType, ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "default" | "compact";
  className?: string;
}
