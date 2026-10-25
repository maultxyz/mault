import { useStations } from "@/features/scanner/api/use-stations";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import { useLayoutEffect } from "react";

export function StationPanels({
  layout,
  size,
}: {
  layout: StationPanelLayout;
  size: number;
}) {
  const { stations, activeStationId, getPanelElement, attachPanels } =
    useStations();

  useLayoutEffect(() => attachPanels(layout), [attachPanels, layout]);

  return (
    <div
      className={cn(
        "relative shrink-0",
        layout === "horizontal" ? "h-full" : "w-full",
      )}
      style={layout === "horizontal" ? { width: size } : { height: size }}
    >
      {stations.map((station) => {
        const isActive = station.id === activeStationId;
        return (
          <div
            key={station.id}
            ref={(node) => {
              const el = getPanelElement(station.id);
              if (node && el.parentNode !== node) node.appendChild(el);
            }}
            inert={!isActive}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 p-2 gap-2 bg-sidebar/70",
              layout === "horizontal"
                ? "flex flex-col overflow-y-auto overflow-x-hidden pt-0"
                : "flex items-stretch overflow-hidden",
              !isActive && "invisible pointer-events-none",
            )}
          />
        );
      })}
    </div>
  );
}
