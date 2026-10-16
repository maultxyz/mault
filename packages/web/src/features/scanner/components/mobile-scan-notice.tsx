import { MOBILE_SCAN_PANEL_CLASS } from "@/lib/constants/scanner";
import type { MobileScanNoticeProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

export function MobileScanNotice({
  title,
  description,
  tone = "neutral",
  action,
}: MobileScanNoticeProps) {
  const Icon = tone === "neutral" ? IconInfoCircle : IconAlertTriangle;
  return (
    <div
      className={cn(
        MOBILE_SCAN_PANEL_CLASS,
        "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
        tone === "warning" && "bg-warning-strong/90",
        tone === "error" && "bg-destructive-strong/90",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-white/80">{description}</p>}
      </div>
      {action}
    </div>
  );
}
