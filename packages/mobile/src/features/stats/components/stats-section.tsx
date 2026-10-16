import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SectionHeader } from "@/components/ui/section-header";
import { SPACING } from "@/lib/constants/theme";
import type { StatsSectionProps } from "@/lib/interfaces/stats";

export function StatsSection({ title, description, action, children }: StatsSectionProps) {
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ gap: 2 }}>
        <SectionHeader title={title} />
        {description ? (
          <AppText size="sm" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {action}
      {children}
    </View>
  );
}
