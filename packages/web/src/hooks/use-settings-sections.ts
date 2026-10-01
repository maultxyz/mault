import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { SETTINGS_SECTIONS } from "@/lib/constants/settings";

export function useSettingsSections() {
  return SETTINGS_SECTIONS.filter(
    (section) => !("hostedOnly" in section) || AUTH_PROVIDER !== "local",
  );
}
