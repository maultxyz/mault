import type { StoragePlanBinsStripProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StoragePlanBinsStrip({
  claims,
  className,
}: StoragePlanBinsStripProps) {
  const { t } = useTranslation("bins");
  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-col">
        <h3 className="font-heading text-sm font-semibold">
          {t("storagePlan.binsNow")}
        </h3>
        <p className="text-xs text-foreground/70">
          {t("storagePlan.binsNowHint")}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 @lg:grid-cols-3 @3xl:grid-cols-5">
        {claims.map((claim) => (
          <li
            key={claim.binNumber}
            className="flex min-w-0 flex-col rounded-lg bg-foreground/6 px-2 py-1.5"
          >
            <span className="truncate text-xs font-medium">
              {t("binLabel", { number: claim.binNumber })}
            </span>
            <span className="flex min-w-0 items-center gap-1 text-xs text-foreground/70">
              <IconArrowRight className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {claim.locationName == null
                  ? t("storagePlan.noLocation")
                  : claim.remainingSlots == null
                    ? claim.locationName
                    : t("storagePlan.claim", {
                        location: claim.locationName,
                        count: claim.remainingSlots,
                      })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
