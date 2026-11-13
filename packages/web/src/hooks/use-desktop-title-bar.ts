import type { WindowControlsOverlayLike } from "@/lib/interfaces/app-shell";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function windowControlsOverlay(): WindowControlsOverlayLike | undefined {
  return (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlayLike })
    .windowControlsOverlay;
}

export function useDesktopTitleBar(): boolean {
  const [isTitleBar, setIsTitleBar] = useState(
    () => !!window.maultDesktop && !!windowControlsOverlay()?.visible,
  );
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const overlay = windowControlsOverlay();
    if (!window.maultDesktop || !overlay) return;
    const update = () => setIsTitleBar(overlay.visible);
    overlay.addEventListener("geometrychange", update);
    update();
    return () => overlay.removeEventListener("geometrychange", update);
  }, []);

  useEffect(() => {
    if (!isTitleBar || (resolvedTheme !== "light" && resolvedTheme !== "dark")) return;
    window.maultDesktop?.setTitleBarTheme?.(resolvedTheme);
  }, [isTitleBar, resolvedTheme]);

  return isTitleBar;
}
