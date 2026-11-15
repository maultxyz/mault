import { usePersistedFlag } from "@/hooks/use-persisted-state";
import type { CollapsibleStatPanelProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CollapsibleStatPanel({
  heading,
  collapsedSummary,
  showLiveIndicator = false,
  expandedStorageKey,
  children,
}: CollapsibleStatPanelProps) {
  const { t } = useTranslation("scanner");
  const [expanded, setExpanded] = usePersistedFlag(expandedStorageKey);

  return (
    <div className="overflow-hidden rounded-card bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-2 p-3 text-left"
      >
        <p className="shrink-0 text-xs font-medium text-foreground/70">
          {heading}
        </p>
        {!expanded && (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
            {showLiveIndicator && (
              <span
                role="img"
                aria-label={t("scannerPip.sorting")}
                className="size-1.5 shrink-0 animate-pulse rounded-full bg-success"
              />
            )}
            <span className="truncate">{collapsedSummary}</span>
          </span>
        )}
        <IconChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-foreground/70 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
