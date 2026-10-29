import { Button } from "@/components/ui/button";
import {
  getScannerControls,
  runScannerCommand,
  subscribeScannerControls,
} from "@/features/scanner/lib/desktop-scanner-controls";
import { DESKTOP_PIP_CONTROL_ICONS } from "@/lib/constants/scanner";
import { useSyncExternalStore } from "react";

export function DesktopPipControls() {
  const buttons = useSyncExternalStore(
    subscribeScannerControls,
    getScannerControls,
  );

  if (!buttons?.length) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 border-t px-3 py-1.5">
      {buttons.map((button) => {
        const ControlIcon = DESKTOP_PIP_CONTROL_ICONS[button.icon];
        return (
          <Button
            key={button.command}
            type="button"
            size="icon"
            className="max-md:size-6 max-md:[&_svg:not([class*='size-'])]:size-3"
            variant={
              button.icon === "auto-feed-on" ? "outline-selected" : "outline"
            }
            aria-label={button.tooltip}
            title={button.tooltip}
            disabled={button.disabled}
            onClick={() => runScannerCommand(button.command)}
          >
            <ControlIcon />
          </Button>
        );
      })}
    </div>
  );
}
