import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { SPACING } from "@/lib/constants/theme";
import type { SettingsSectionProps } from "@/lib/interfaces/settings";

export function SettingsSection({ title, description, badge, children }: SettingsSectionProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ gap: 2 }}>
        <SectionHeader title={title} action={badge ? <Pill label={badge} /> : undefined} />
        {description ? (
          <AppText size="xs" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}
