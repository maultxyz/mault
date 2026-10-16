import { useContext } from "react";
import { useColorScheme } from "react-native";
import { DARK_COLORS, LIGHT_COLORS } from "@/lib/constants/theme";
import type { ThemeColors } from "@/lib/interfaces/theme";
import { ThemeColorsContext } from "@/lib/theme-context";

export function useTheme(): ThemeColors {
  const colors = useContext(ThemeColorsContext);
  const scheme = useColorScheme();
  return colors ?? (scheme === "dark" ? DARK_COLORS : LIGHT_COLORS);
}
