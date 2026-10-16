import { useColorScheme } from "react-native";
import { DARK_COLORS, LIGHT_COLORS } from "@/lib/constants/theme";
import type { ThemeColors } from "@/lib/interfaces/theme";

export function useTheme(): ThemeColors {
  return useColorScheme() === "dark" ? DARK_COLORS : LIGHT_COLORS;
}
