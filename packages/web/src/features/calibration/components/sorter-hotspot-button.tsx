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
        "absolute top-0 left-0 grid size-7 place-items-center rounded-full bg-card/90 shadow-popover ring-1 ring-border transition-shadow hover:z-10 hover:ring-2 hover:ring-primary focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected && "z-10 ring-2 ring-primary",
      )}
    >
      <span
        aria-hidden
        className="size-3.5 rounded-full ring-2 ring-card"
        style={{ backgroundColor: SORTER_MODEL_PART_COLORS[part] }}
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-full ml-1.5 -translate-y-1/2 rounded-md bg-card/90 px-1.5 ring-1 ring-border py-0.5 text-2xs font-medium whitespace-nowrap text-foreground shadow-sm",
          selected && "ring-primary",
        )}
      >
        {partName}
      </span>
    </button>
  );
}
