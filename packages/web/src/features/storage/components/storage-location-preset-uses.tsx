import { Badge } from "@/components/ui/badge";
import { useStorageLocationPresetUses } from "@/features/storage/api/use-storage-plan-uses";
import { STORAGE_PRESET_USES_HEADING_ID } from "@/lib/constants/storage";
import { sortingRulesPresetStoragePath } from "@/lib/constants/bins";
import type { StorageLocationPresetUsesProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StorageLocationPresetUses({
  locationGuid,
}: StorageLocationPresetUsesProps) {
  const { t } = useTranslation("storage");
  const { uses, isPending } = useStorageLocationPresetUses(locationGuid);

  if (isPending) return null;
  if (uses.length === 0) {
    return (
      <p className="text-xs text-foreground/70">{t("planUses.none")}</p>
    );
  }

  return (
    <section
      aria-labelledby={STORAGE_PRESET_USES_HEADING_ID}
      className="flex flex-col gap-1.5 rounded-card bg-card p-3 md:gap-1 md:p-2.5"
    >
      <h2
        id={STORAGE_PRESET_USES_HEADING_ID}
        className="text-sm font-medium"
      >
        {t("planUses.heading")}
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {uses.map((use) => (
          <li
            key={use.presetGuid}
            className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Link
                to={sortingRulesPresetStoragePath(use.presetGuid)}
                className="truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {use.presetName}
              </Link>
              {use.isActive && (
                <Badge variant="success">{t("planUses.active")}</Badge>
              )}
            </div>
            <p className="text-xs tabular-nums text-foreground/70">
              {[
                use.gameName,
                t("planUses.position", {
                  position: use.planPosition,
                  total: use.planLength,
                }),
                use.fillingBinNumber != null
                  ? t("planUses.filling", { bin: use.fillingBinNumber })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
