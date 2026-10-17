import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { GradientBurst } from "@/components/ui/gradient-burst";
import { IconButton } from "@/components/ui/icon-button";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { PageHeaderProps } from "@/lib/interfaces/ui";

export function PageHeader({ title, subtitle, subtitleAccessory, onBack, actions, children }: PageHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const actionRow = actions ? <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>{actions}</View> : null;

  return (
    <View
      style={{
        gap: SPACING.md,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.md,
      }}
    >
      <GradientBurst />
      {onBack ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
          <IconButton icon="back" accessibilityLabel={t("common.back")} onPress={onBack} />
          {actionRow}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: onBack ? undefined : 44 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText size={onBack ? "2xl" : "3xl"} heading weight="bold" numberOfLines={2} accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {subtitleAccessory}
              <AppText size="sm" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
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
