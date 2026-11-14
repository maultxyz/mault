export type StatusDotVariant = "success" | "warning" | "error" | "muted";

export interface StatusDotProps {
  variant: StatusDotVariant;
}

export interface StatusItemProps {
  label: string;
  dot: StatusDotVariant;
  tooltip: string;
  onClick?: () => void;
}
