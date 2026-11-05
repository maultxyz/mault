import { useDesktopPipWindow } from "@/features/scanner/api/use-desktop-pip-window";
import { useDesktopBackground } from "@/features/scanner/api/use-desktop-window-state";
import { useStations } from "@/features/scanner/api/use-stations";
import {
  setDesktopPipContainer,
  setDesktopPipDismiss,
  useDesktopPipHost,
} from "@/features/scanner/lib/desktop-pip-host-store";
import { DESKTOP_PIP_OPEN_DELAY_MS } from "@/lib/constants/scanner";
import { useEffect, useState } from "react";

export function DesktopPipWindowHost() {
  const { connectedStationIds } = useStations();
  const { hasContent } = useDesktopPipHost();
  const background = useDesktopBackground();
  const [settledBackground, setSettledBackground] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!background) {
      setSettledBackground(false);
      setDismissed(false);
      return;
    }
    const timer = setTimeout(() => setSettledBackground(true), DESKTOP_PIP_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [background]);

  useEffect(() => {
    setDesktopPipDismiss(() => setDismissed(true));
  }, []);

  const open =
    settledBackground && !dismissed && hasContent && connectedStationIds.size > 0;
  const container = useDesktopPipWindow(open, () => setDismissed(true));

  useEffect(() => {
    setDesktopPipContainer(container);
  }, [container]);

  return null;
}
