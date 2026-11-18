import type { ViewProps } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

export function TabBottomSafeAreaView({ style, ...props }: ViewProps) {
  return <SafeAreaView {...props} style={[{ flex: 0 }, style]} edges={{ bottom: true }} />;
}
