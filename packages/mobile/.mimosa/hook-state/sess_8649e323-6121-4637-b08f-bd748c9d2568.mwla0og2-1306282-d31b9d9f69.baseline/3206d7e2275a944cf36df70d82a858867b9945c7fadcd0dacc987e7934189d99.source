import { StyleSheet, View } from "react-native";
import { useOrgThemeColors } from "@/hooks/use-org-theme-colors";
import { SCREEN_GUTTER } from "@/lib/constants/theme";
import type { CameraEmptyStateFrameProps } from "@/lib/interfaces/scanner";
import { ThemeColorsContext } from "@/lib/theme-context";

export function CameraEmptyStateFrame({ children }: CameraEmptyStateFrameProps) {
  const cameraColors = useOrgThemeColors(true);
  return (
    <ThemeColorsContext.Provider value={cameraColors}>
      <View style={[StyleSheet.absoluteFill, { justifyContent: "center", padding: SCREEN_GUTTER }]}>{children}</View>
    </ThemeColorsContext.Provider>
  );
}
