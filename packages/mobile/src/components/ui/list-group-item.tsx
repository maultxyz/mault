import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { SURFACE_RADIUS } from "@/lib/constants/theme";
import type { ListGroupItemProps } from "@/lib/interfaces/ui";

export function ListGroupItem({ index, count, children }: ListGroupItemProps) {
  const colors = useTheme();
  const isFirst = index === 0;
  const isLast = index === count - 1;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderCurve: "continuous",
        overflow: "hidden",
        borderTopLeftRadius: isFirst ? SURFACE_RADIUS : 0,
        borderTopRightRadius: isFirst ? SURFACE_RADIUS : 0,
        borderBottomLeftRadius: isLast ? SURFACE_RADIUS : 0,
        borderBottomRightRadius: isLast ? SURFACE_RADIUS : 0,
        paddingTop: isFirst ? 4 : 0,
        paddingBottom: isLast ? 4 : 0,
      }}
    >
      {children}
    </View>
  );
}
