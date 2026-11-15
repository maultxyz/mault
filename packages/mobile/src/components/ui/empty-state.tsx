import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { SPACING } from "@/lib/constants/theme";
import { EMPTY_STATE_ICON_SIZE } from "@/lib/constants/ui";
import type { EmptyStateProps } from "@/lib/interfaces/ui";

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: SPACING.md, paddingVertical: 64 }}>
      <IconBadge name={icon} tone="primary" size={EMPTY_STATE_ICON_SIZE} />
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
