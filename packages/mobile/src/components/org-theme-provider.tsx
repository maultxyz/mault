import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useActiveOrgId } from "@/hooks/use-org";
import { THEME_COLORS } from "@/lib/constants/settings";
import { DARK_COLORS, LIGHT_COLORS } from "@/lib/constants/theme";
import type { OrgThemeProviderProps } from "@/lib/interfaces/theme";
import { applyPrimaryColor } from "@/lib/primary-color";
import { ThemeColorsContext } from "@/lib/theme-context";

export function OrgThemeProvider({ children }: OrgThemeProviderProps) {
  const dark = useColorScheme() === "dark";
  const { data } = useQuery(orgSettingsQueryOptions(useActiveOrgId()));
  const primaryName = data?.primaryColor ?? null;
  const colors = useMemo(
    () =>
      applyPrimaryColor(
        dark ? DARK_COLORS : LIGHT_COLORS,
        THEME_COLORS.find((color) => color.name === primaryName) ?? null,
        dark,
      ),
    [dark, primaryName],
  );
  return <ThemeColorsContext.Provider value={colors}>{children}</ThemeColorsContext.Provider>;
}
