import { View } from "react-native";
import { SPACING } from "@/lib/constants/theme";
import type { ListGroupProps } from "@/lib/interfaces/ui";

export function ListGroup({ children }: ListGroupProps) {
  return <View style={{ marginHorizontal: -SPACING.sm }}>{children}</View>;
}
