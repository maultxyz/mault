import type { ComponentProps } from "react";

export type IconBadgeSize = "compact" | "sm" | "default" | "lg" | "xl" | "2xl";

export type IconBadgeTone =
  | "neutral"
  | "primary"
  | "destructive"
  | "warning"
  | "success";

export interface IconBadgeProps extends ComponentProps<"span"> {
  size?: IconBadgeSize;
  tone?: IconBadgeTone;
}
