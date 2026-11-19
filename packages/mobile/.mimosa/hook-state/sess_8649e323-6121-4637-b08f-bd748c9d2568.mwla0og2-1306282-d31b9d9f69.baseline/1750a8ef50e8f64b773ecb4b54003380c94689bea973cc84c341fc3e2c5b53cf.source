import { useColorScheme } from "react-native";
import { useOrgThemeColors } from "@/hooks/use-org-theme-colors";
import type { OrgThemeProviderProps } from "@/lib/interfaces/theme";
import { ThemeColorsContext } from "@/lib/theme-context";

export function OrgThemeProvider({ children }: OrgThemeProviderProps) {
  const colors = useOrgThemeColors(useColorScheme() === "dark");
  return <ThemeColorsContext.Provider value={colors}>{children}</ThemeColorsContext.Provider>;
}
