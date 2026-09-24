import { useStations } from "@/features/scanner/api/use-stations";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import { useLayoutEffect } from "react";

// Hosts each station's scanner column. The column itself is portaled from the
// station's own StationScope into a DOM node the stations store owns, and
// this only moves that node into place, so switching tabs (which remounts
// this page under another station) never remounts a running scanner.
// Background stations stay laid out at full size but invisible, rather than
// display:none, since the scanner sizes its preview from its container and
// keeps sorting while its tab isn't selected.
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
              "absolute inset-0 overflow-hidden p-2 gap-2 bg-sidebar/70",
              layout === "horizontal" ? "flex flex-col" : "flex items-stretch",
              !isActive && "invisible pointer-events-none",
            )}
          />
        );
      })}
    </div>
  );
}
