import { Children, Fragment, isValidElement } from "react";
import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { SURFACE_RADIUS } from "@/lib/constants/theme";
import type { ListGroupProps } from "@/lib/interfaces/ui";

export function ListGroup({ children }: ListGroupProps) {
  const colors = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  if (rows.length === 0) return null;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: SURFACE_RADIUS,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingVertical: 4,
      }}
    >
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>{row}</Fragment>
      ))}
    </View>
  );
}
