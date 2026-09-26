import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { BIN_SLOTS_PHYSICAL_ORDER } from "@/lib/constants/calibration";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function BinCell({
  binNumber,
  active,
  isCatchAll,
  inverted,
}: {
  binNumber: number;
  active: boolean;
  isCatchAll: boolean;
  inverted: boolean;
}) {
  const { t } = useTranslation("bins");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-2 text-[11px] font-semibold",
        active
          ? "bg-primary text-primary-foreground"
          : inverted
            ? "text-background/70"
            : "text-muted-foreground",
      )}
    >
      <span>{t("binLabel", { number: binNumber })}</span>
      {isCatchAll && (
        <span
          className={cn(
            "text-[8px] font-normal uppercase tracking-wide",
            active
              ? "text-primary-foreground/80"
              : inverted
                ? "text-background/50"
                : "text-muted-foreground/70",
          )}
        >
          {t("catchAll")}
        </span>
      )}
    </div>
  );
}

interface BinLocationDiagramProps {
  binNumber?: number;
  // Set false when rendering directly on a normal page/card surface rather
  // than inside a dark Tooltip (bg-foreground/text-background) popup.
  inverted?: boolean;
}

export function BinLocationDiagram({
  binNumber,
  inverted = true,
}: BinLocationDiagramProps) {
  const { configs } = useBinConfigs();
  const { routes } = useBinRoutes();
  const catchAllBin = configs.find((c) => c.isCatchAll)?.binNumber;

  const modules = Array.from(
    new Set(
      routes.filter((r) => r.direction !== "bottom").map((r) => r.module),
    ),
  ).sort((a, b) => a - b);
  const bottomRoutes = routes.filter((r) => r.direction === "bottom");

  return (
    <div className="overflow-hidden rounded-lg">
      {modules.map((module) => (
        <div key={module} className="grid grid-cols-2">
          {BIN_SLOTS_PHYSICAL_ORDER.map(({ direction }) => {
            const slotBin = routes.find(
              (r) => r.module === module && r.direction === direction,
            )?.binNumber;
            return (
              slotBin !== undefined && (
                <BinCell
                  key={direction}
                  binNumber={slotBin}
                  active={binNumber === slotBin}
                  isCatchAll={catchAllBin === slotBin}
                  inverted={inverted}
                />
              )
            );
          })}
        </div>
      ))}
      {bottomRoutes.map((route) => (
        <BinCell
          key={route.binNumber}
          binNumber={route.binNumber}
          active={binNumber === route.binNumber}
          isCatchAll={catchAllBin === route.binNumber}
          inverted={inverted}
        />
      ))}
    </div>
  );
}
