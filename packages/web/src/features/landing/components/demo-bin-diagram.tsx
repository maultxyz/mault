import { CATCH_ALL_BIN } from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DEMO_BIN_DIAGRAM_MODULES } from "@/lib/constants/landing";

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
        "flex flex-col items-center justify-center px-4 py-3 text-xs font-semibold",
        active ? "bg-primary text-primary-foreground" : "text-foreground/70",
      )}
    >
      <span>{t("binLabel", { number: binNumber })}</span>
      {isCatchAll && (
        <span
          className={cn(
            "text-2xs font-normal tracking-wide uppercase",
            active ? "text-primary-foreground/80" : "text-foreground/70",
          )}
        >
          {t("catchAll")}
        </span>
      )}
    </div>
  );
}

export function DemoBinDiagram({ activeBin = 4 }: { activeBin?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border bg-background">
      {DEMO_BIN_DIAGRAM_MODULES.map((m) => (
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
