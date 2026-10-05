import { useHotkeys } from "@/hooks/use-hotkeys";
import { useRole } from "@/hooks/use-role";
import { HOTKEY_ROUTES, HOTKEY_SEARCH_ATTRIBUTE } from "@/lib/constants/hotkeys";
import { focusHotkeySearch } from "@/lib/hotkeys";
import { useNavigate } from "react-router-dom";

export function AppHotkeys() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const go = (route: string) => () => navigate(route);

  useHotkeys({
    focusSearch: () => focusHotkeySearch(`[${HOTKEY_SEARCH_ATTRIBUTE}]`),
    goScanner: go(HOTKEY_ROUTES.goScanner),
    goCollections: go(HOTKEY_ROUTES.goCollections),
    goMonitor: go(HOTKEY_ROUTES.goMonitor),
    goStorage: go(HOTKEY_ROUTES.goStorage),
    goCalibrate: go(HOTKEY_ROUTES.goCalibrate),
    goSettings: go(HOTKEY_ROUTES.goSettings),
    goAdmin: isAdmin ? go(HOTKEY_ROUTES.goAdmin) : undefined,
  });

  return null;
}
