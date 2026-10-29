import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { PageHeaderProps } from "@/lib/interfaces/ui";

export function PageHeader({ title, subtitle, subtitleAccessory, onBack, actions, children }: PageHeaderProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const actionRow = actions ? <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>{actions}</View> : null;

  return (
    <View
      style={{
        gap: SPACING.sm + 2,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: SPACING.sm + 2,
        paddingBottom: SPACING.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {onBack ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
          <IconButton icon="back" accessibilityLabel={t("common.back")} onPress={onBack} />
          {actionRow}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: 40 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText size="lg" heading weight="semibold" numberOfLines={2} accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {subtitleAccessory}
              <AppText size="xs" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {subtitle}
              </AppText>
            </View>
          ) : null}
        </View>
        {onBack ? null : actionRow}
      </View>
      {children}
    </View>
  );
}
