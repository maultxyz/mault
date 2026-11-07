import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import type { PanelClipProps } from "@/lib/interfaces/ui";

export function PanelClip({ children, backgroundColor }: PanelClipProps) {
  const colors = useTheme();
  return (
    <View
      collapsable={false}
      style={{ flex: 1, borderRadius: RADIUS.md - 1, overflow: "hidden", backgroundColor: backgroundColor ?? colors.background }}
    >
      {children}
    </View>
  );
}
