import type { ComponentProps } from "react";

export type ProgressSize = "sm" | "default" | "lg";

export type ProgressTone = "primary" | "warning";

export interface ProgressProps
  extends Omit<ComponentProps<"div">, "children" | "role"> {
  value: number;
  max?: number;
  size?: ProgressSize;
  tone?: ProgressTone;
  role?: "progressbar" | "meter";
  decorative?: boolean;
  indicatorClassName?: string;
}
