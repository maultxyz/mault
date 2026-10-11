import { SETTINGS_SECTIONS } from "@/lib/constants/settings";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

export function useSettingsSections() {
  return SETTINGS_SECTIONS.filter(
    (section) => !("hostedOnly" in section) || AUTH_PROVIDER !== "local",
  );
}
