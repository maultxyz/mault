import { Children, Fragment, isValidElement } from "react";
import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER } from "@/lib/constants/theme";
import type { ListGroupProps } from "@/lib/interfaces/ui";

export function ListGroup({ children }: ListGroupProps) {
  const colors = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginHorizontal: -SCREEN_GUTTER }}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
