import type { ScanningPillProps } from "@/lib/interfaces/collections";
import { useTranslation } from "react-i18next";

export function ScanningPill({ isOwn }: ScanningPillProps) {
  const { t } = useTranslation("scanner");
  return (
    <span className="flex items-center gap-1 rounded-full bg-warning-muted px-1.5 py-0.5 text-warning-foreground shadow-sm ring-1 ring-warning-border">
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-warning motion-reduce:animate-none" />
      <span className="text-2xs font-medium">
        {isOwn
          ? t("monitorSessions.yourSession")
          : t("monitorSessions.scanning")}
      </span>
    </span>
  );
}
