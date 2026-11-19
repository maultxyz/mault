import * as Haptics from "expo-haptics";
import type { AccessibilityActionEvent } from "react-native";

export function longPressProps(onLongPress: (() => void) | undefined, longPressLabel: string | undefined) {
  if (!onLongPress) return {};
  const runLongPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };
  return {
    onLongPress: runLongPress,
    accessibilityActions: [{ name: "longpress", label: longPressLabel }],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "longpress") runLongPress();
    },
  };
}
