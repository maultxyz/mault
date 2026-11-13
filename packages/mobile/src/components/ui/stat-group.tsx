import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { SPACING } from "@/lib/constants/theme";
import type { StatGroupProps } from "@/lib/interfaces/ui";

export function StatGroup({ heading, children }: StatGroupProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      {heading ? <SectionHeader title={heading} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACING.xs, rowGap: SPACING.sm }}>
        {children}
      </View>
    </View>
  );
}
