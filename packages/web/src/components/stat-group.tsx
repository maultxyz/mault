import { CompactCount } from "@/components/compact-value";
import { IconBadge } from "@/components/icon-badge";
import type { StatGroupProps, StatTileContentProps } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function StatTileContent({ tile }: StatTileContentProps) {
  const TileIcon = tile.icon;
  return (
    <>
      {TileIcon && (
        <IconBadge aria-hidden size="compact" className="mb-2 md:mb-1.5">
          <TileIcon className="size-4" />
        </IconBadge>
      )}
      <p className="text-xs text-foreground/70">{tile.label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground md:text-base">
        {typeof tile.value === "number" ? (
          <CompactCount value={tile.value} />
        ) : (
          (tile.value ?? "-")
        )}
      </p>
      {tile.detail !== undefined && (
        <p className="text-2xs text-foreground/70">{tile.detail ?? "-"}</p>
      )}
    </>
  );
}

export function StatGroup({
  heading,
  tiles,
  live,
  gridClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
}: StatGroupProps) {
  const { t } = useTranslation("common");
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">
          {heading}
        </h2>
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
      <div className={cn("grid gap-2", gridClassName)}>
        {tiles.map((tile) =>
          tile.onClick ? (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              className="flex cursor-pointer flex-col items-start rounded-card bg-card p-3 md:p-2 text-left transition-colors hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <StatTileContent tile={tile} />
            </button>
          ) : (
            <div key={tile.key} className="flex flex-col items-start rounded-card bg-card p-3 md:p-2">
              <StatTileContent tile={tile} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
