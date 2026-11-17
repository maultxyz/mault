import type { StatGroupProps } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function StatGroup({
  heading,
  tiles,
  live,
  gridClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
}: StatGroupProps) {
  const { t } = useTranslation("common");
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-input/20 dark:bg-input/30">
      <div className="flex items-center gap-1.5 border-b border-input px-2 py-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
          {heading}
        </p>
        {live !== undefined && (
          <>
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                live
                  ? "bg-success animate-pulse motion-reduce:animate-none"
                  : "bg-muted-foreground/40",
              )}
            />
            <span className="sr-only">
              {live ? t("a11y.live") : t("a11y.notLive")}
            </span>
          </>
        )}
      </div>
      <div className={cn("-mr-px -mb-px grid", gridClassName)}>
        {tiles.map((tile) => {
          const content = (
            <>
              <p className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
                {tile.label}
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {tile.value ?? "-"}
              </p>
              {tile.detail !== undefined && (
                <p className="text-2xs text-foreground/70">
                  {tile.detail ?? "-"}
                </p>
              )}
            </>
          );
          return tile.onClick ? (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              className="cursor-pointer border-r border-b border-input p-2 text-left transition-colors hover:bg-input/40 focus-visible:bg-input/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {content}
            </button>
          ) : (
            <div key={tile.key} className="border-r border-b border-input p-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
