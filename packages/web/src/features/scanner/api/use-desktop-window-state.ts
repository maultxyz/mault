import { useEffect, useState } from "react";

export function useDesktopBackground(): boolean {
  const [background, setBackground] = useState(false);

  useEffect(() => {
    const desktop = window.maultDesktop;
    if (!desktop) return;
    let active = true;
    void desktop.getWindowState().then((state) => {
      if (active) setBackground(state.background);
    });
    const unsubscribe = desktop.onWindowState((state) => setBackground(state.background));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return background;
}
