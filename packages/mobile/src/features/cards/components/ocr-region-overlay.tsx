import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { OcrRegionOverlayProps } from "@/lib/interfaces/cards";

export function OcrRegionOverlay({ regions }: OcrRegionOverlayProps) {
  const colors = useTheme();
  if (regions.length === 0) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", inset: 0 }}
    >
      {regions.map((region, index) => (
        <View
          key={`${region.field}-${index}`}
          style={{
            position: "absolute",
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
            borderWidth: 1,
            borderStyle: region.fallback ? "dashed" : region.anchored === false ? "dotted" : "solid",
            borderColor: region.fallback ? colors.warning : colors.primary,
            backgroundColor: region.fallback ? `${colors.warning}1a` : `${colors.primary}1a`,
          }}
        />
      ))}
    </View>
  );
}
