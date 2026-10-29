import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { EmptyStateProps } from "@/lib/interfaces/ui";

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: SPACING.md, paddingVertical: 64 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: RADIUS.md,
          backgroundColor: colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={28} color={colors.foregroundSecondary} />
      </View>
      <View style={{ maxWidth: 384, gap: SPACING.xs, alignItems: "center" }}>
        <AppText weight="medium" style={{ textAlign: "center" }}>
          {title}
        </AppText>
        {description ? (
          <AppText size="xs" tone="secondary" style={{ textAlign: "center" }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
