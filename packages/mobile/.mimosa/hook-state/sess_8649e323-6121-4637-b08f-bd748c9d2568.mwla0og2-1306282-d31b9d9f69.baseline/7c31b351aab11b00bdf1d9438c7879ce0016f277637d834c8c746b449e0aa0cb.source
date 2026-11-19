import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { SPACING } from "@/lib/constants/theme";
import type { StatsSectionProps } from "@/lib/interfaces/stats";

export function StatsSection({ title, description, action, children }: StatsSectionProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ gap: 2 }}>
        <SectionHeader title={title} />
        {description ? (
          <AppText size="sm" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Surface style={{ gap: SPACING.md }}>
        {action}
        {children}
      </Surface>
    </View>
  );
}
