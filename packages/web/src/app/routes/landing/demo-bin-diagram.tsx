import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const MODULES = [
  { module: 1, left: 1, right: 2 },
  { module: 2, left: 3, right: 4 },
  { module: 3, left: 5, right: 6 },
];
const CATCH_ALL_BIN = 7;

// A read-only stand-in for features/bins/components/bin-location-diagram.tsx,
// reusing its cell layout and translations - the real diagram pulls its
// routing from useBinConfigs/useBinRoutes, which need the QueryClientProvider
// tree that only wraps the authenticated /app/* routes, not this public page.
// It's also only ever used against a dark tooltip surface (inverted styling);
// here it sits directly on a card background, so the active/inactive
// contrast is adapted accordingly.
function BinCell({
  binNumber,
  active,
  isCatchAll,
}: {
  binNumber: number;
  active: boolean;
  isCatchAll: boolean;
}) {
  const { t } = useTranslation("bins");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-3 text-[11px] font-semibold",
        active ? "bg-primary text-primary-foreground" : "text-foreground/70",
      )}
    >
      <span>{t("binLocationDiagram.binLabel", { number: binNumber })}</span>
      {isCatchAll && (
        <span
          className={cn(
            "text-[8px] font-normal tracking-wide uppercase",
            active ? "text-primary-foreground/80" : "text-foreground/70",
          )}
        >
          {t("binLocationDiagram.catchAll")}
        </span>
      )}
    </div>
  );
}

export function DemoBinDiagram({ activeBin = 4 }: { activeBin?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border bg-background">
      {MODULES.map((m) => (
        <div key={m.module} className="grid grid-cols-2 divide-x divide-border">
          <BinCell
            binNumber={m.left}
            active={activeBin === m.left}
            isCatchAll={false}
          />
          <BinCell
            binNumber={m.right}
            active={activeBin === m.right}
            isCatchAll={false}
          />
        </div>
      ))}
      <BinCell
        binNumber={CATCH_ALL_BIN}
        active={activeBin === CATCH_ALL_BIN}
        isCatchAll
      />
    </div>
  );
}
