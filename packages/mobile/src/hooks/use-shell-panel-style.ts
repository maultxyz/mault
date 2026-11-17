import type { ViewStyle } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { SHELL_PANEL_INSET } from "@/lib/constants/ui";

export function useShellPanelStyle(marginBottom = 0): ViewStyle {
  const colors = useTheme();
  return {
    flex: 1,
    marginHorizontal: SHELL_PANEL_INSET,
    marginBottom,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
  };
}
