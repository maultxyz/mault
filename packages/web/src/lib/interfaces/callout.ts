import type { ComponentType, ReactNode } from "react";

export type CalloutVariant = "neutral" | "info" | "success" | "warning" | "error";

export interface CalloutProps {
  variant?: CalloutVariant;
  icon?: ComponentType<{ className?: string }>;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}
