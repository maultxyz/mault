import type { StationToastTitleProps } from "@/lib/interfaces/toast";

export function StationToastTitle({
  stationName,
  children,
}: StationToastTitleProps) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-xs font-medium opacity-70">{stationName}</span>
      <span>{children}</span>
    </span>
  );
}
