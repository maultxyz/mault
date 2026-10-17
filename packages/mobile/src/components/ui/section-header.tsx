import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import type { SectionHeaderProps } from "@/lib/interfaces/ui";

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 28,
      }}
    >
      <AppText size="lg" heading weight="bold">
        {title}
      </AppText>
      {action}
    </View>
  );
}
