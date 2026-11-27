import { Button } from "@/components/ui/button";
import type { QuickAddLogProps } from "@/lib/interfaces/cards";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function QuickAddLog({ entries, onUndo }: QuickAddLogProps) {
  const { t } = useTranslation("cards");
  const headingId = useId();
  const addedCardCount = entries
    .filter((entry) => entry.status === "added")
    .reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-h-0 flex-col gap-2 rounded-lg bg-foreground/6 p-2"
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 id={headingId} className="text-sm font-semibold">
          {t("quickAdd.logTitle")}
        </h3>
        <span className="text-xs tabular-nums text-foreground/70">
          {t("quickAdd.addedCount", { count: addedCardCount })}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="px-1 text-xs text-foreground/70">{t("quickAdd.logEmpty")}</p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={
                    entry.status === "undone" || entry.status === "failed"
                      ? "truncate text-xs font-semibold line-through"
                      : "truncate text-xs font-semibold"
                  }
                >
                  <span className="tabular-nums">{entry.quantity}x</span>{" "}
                  {entry.card.name}
                </p>
                <p className="truncate text-2xs text-foreground/70">
                  {[
                    `${entry.card.set.toUpperCase()} #${entry.card.collectorNumber}`,
                    entry.isFoil ? t("quickAdd.foil") : null,
                    entry.condition,
                    entry.locationName
                      ? `${entry.collectionName}, ${entry.locationName}`
                      : entry.collectionName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {entry.status !== "added" && (
                  <p
                    className={
                      entry.status === "failed"
                        ? "text-2xs font-medium text-destructive"
                        : "text-2xs font-medium text-foreground/70"
                    }
                  >
                    {t(`quickAdd.status.${entry.status}`)}
                  </p>
                )}
              </div>
              {entry.status === "added" && (
                <Button
                  variant="ghost"
                  aria-label={t("quickAdd.undoLabel", {
                    count: entry.quantity,
                    name: entry.card.name,
                  })}
                  onClick={() => onUndo(entry)}
                >
                  {t("quickAdd.undo")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
