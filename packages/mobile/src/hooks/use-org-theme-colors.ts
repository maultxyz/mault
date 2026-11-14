import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useActiveOrgId } from "@/hooks/use-org";
import { THEME_COLORS } from "@/lib/constants/settings";
import { DARK_COLORS, LIGHT_COLORS } from "@/lib/constants/theme";
import type { ThemeColors } from "@/lib/interfaces/theme";
import { applyPrimaryColor } from "@/lib/primary-color";

export function useOrgThemeColors(dark: boolean): ThemeColors {
  const { data } = useQuery(orgSettingsQueryOptions(useActiveOrgId()));
  const primaryName = data?.primaryColor ?? null;
  return useMemo(
    () =>
      applyPrimaryColor(
        dark ? DARK_COLORS : LIGHT_COLORS,
        THEME_COLORS.find((color) => color.name === primaryName) ?? null,
        dark,
      ),
    [dark, primaryName],
  );
}
