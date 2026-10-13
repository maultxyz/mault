import { Button } from "@/components/ui/button";
import { usePickListActions } from "@/features/bins/api/use-pick-list";
import type { PickListProgressProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import {
  getPickListTotals,
  isPickListEntryComplete,
} from "@magic-vault/shared";
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconLoader2,
  IconMinus,
  IconPlus,
  IconRotate,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PickListProgress({
  binGuid,
  pickList,
  canAdjust,
}: PickListProgressProps) {
  const { t } = useTranslation("bins");
  const { adjust, reset, isResetting } = usePickListActions(binGuid);
  const untilFound = pickList.mode === "until_found";
  const { wanted: totalWanted, found: totalFound } =
    getPickListTotals(pickList);
  const percent = totalWanted
    ? Math.min(100, Math.round((totalFound / totalWanted) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">
          {untilFound
            ? t("pickList.progress.foundOf", {
                found: totalFound,
                total: totalWanted,
              })
            : t("pickList.progress.foundAll", { count: totalFound })}
        </p>
        {canAdjust && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isResetting || totalFound === 0}
          >
            {isResetting ? (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconRotate />
            )}
            {t("pickList.progress.reset")}
          </Button>
        )}
      </div>
      {untilFound && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <ul className="flex flex-col divide-y rounded-lg border">
        {pickList.entries.map((entry) => {
          const complete = isPickListEntryComplete(entry, pickList);
          return (
            <li
              key={entry.name}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm"
            >
              {complete ? (
                <IconCircleCheckFilled className="size-4 shrink-0 text-success" />
              ) : (
                <IconCircleDashed className="size-4 shrink-0 text-foreground/70" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  complete && "line-through text-foreground/70",
                )}
              >
                {entry.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-foreground/70">
                {untilFound
                  ? t("pickList.progress.entryCount", {
                      found: entry.found,
                      total: entry.quantity,
                    })
                  : entry.found}
              </span>
              {canAdjust && (
                <span className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("pickList.progress.decrease", {
                      name: entry.name,
                    })}
                    disabled={entry.found === 0}
                    onClick={() => adjust(entry.name, -1)}
                  >
                    <IconMinus />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("pickList.progress.increase", {
                      name: entry.name,
                    })}
                    disabled={complete}
                    onClick={() => adjust(entry.name, 1)}
                  >
                    <IconPlus />
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
