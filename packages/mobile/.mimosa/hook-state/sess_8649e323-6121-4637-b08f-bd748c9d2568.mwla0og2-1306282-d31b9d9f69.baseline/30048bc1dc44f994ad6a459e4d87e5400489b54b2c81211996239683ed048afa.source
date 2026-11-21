import type { ViewStyle } from "react-native";
import { useTheme } from "@/hooks/use-theme";

export function useShellPanelStyle(marginBottom = 0): ViewStyle {
  const colors = useTheme();
  return { flex: 1, marginBottom, backgroundColor: colors.background, overflow: "hidden" };
}
