import type { ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function TabBottomSafeAreaView(props: ViewProps) {
  return <SafeAreaView {...props} edges={["bottom"]} />;
}
