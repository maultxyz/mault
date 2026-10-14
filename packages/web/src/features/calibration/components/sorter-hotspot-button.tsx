import { SORTER_MODEL_PART_COLORS } from "@/lib/constants/sorter-model";
import type { SorterHotspotButtonProps } from "@/lib/interfaces/sorter-model";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function SorterHotspotButton({
  hotspot,
  selected,
  onSelect,
  register,
}: SorterHotspotButtonProps) {
  const { t } = useTranslation("calibration");
  const part = hotspot.kind === "feeder" ? "feeder" : hotspot.servo;
  const partName = t(`sorterModel.parts.${part}`);
  const label =
    hotspot.kind === "feeder"
      ? partName
      : t("sorterModel.hotspotLabel", {
          module: hotspot.module,
          part: partName,
        });

  return (
    <button
      ref={(element) => register(hotspot, element)}
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={() => onSelect(hotspot)}
      style={{ visibility: "hidden" }}
      className={cn(
        "absolute top-0 left-0 grid size-7 place-items-center rounded-full border border-foreground/20 bg-background/90 shadow-sm transition-shadow hover:z-10 hover:ring-2 hover:ring-foreground/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected && "z-10 ring-2 ring-foreground",
      )}
    >
      <span
        aria-hidden
        className="size-3.5 rounded-full ring-2 ring-background"
        style={{ backgroundColor: SORTER_MODEL_PART_COLORS[part] }}
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-full ml-1.5 -translate-y-1/2 rounded-md border border-foreground/10 bg-background/90 px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap text-foreground shadow-sm",
          selected && "border-foreground/40",
        )}
      >
        {partName}
      </span>
    </button>
  );
}
