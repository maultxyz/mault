import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { AlertsSheetProps } from "@/lib/interfaces/stream";

export function AlertsSheet({ visible, alerts, onClose }: AlertsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const toneColor = { info: colors.info, warning: colors.warning, danger: colors.destructive };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          maxHeight: "75%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <AppText size="lg" heading weight="bold">
              {t("alerts.title")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {`v${Constants.expoConfig?.version ?? ""}`}
            </AppText>
          </View>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm, paddingBottom: SPACING.md }}>
          {alerts.length === 0 ? (
            <AppText size="sm" tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
              {t("alerts.empty")}
            </AppText>
          ) : (
            alerts.map((alert) => (
              <Pressable
                key={alert.id}
                accessibilityRole={alert.link ? "link" : undefined}
                disabled={!alert.link}
                onPress={() => (alert.link ? void Linking.openURL(alert.link) : undefined)}
                style={{
                  flexDirection: "row",
                  gap: SPACING.sm,
                  padding: SPACING.md,
                  borderRadius: RADIUS.lg,
                  backgroundColor: colors.muted,
                }}
              >
                <Icon name={alert.severity === "info" ? "info" : "warning"} size={18} color={toneColor[alert.severity]} />
                <View style={{ flex: 1, gap: SPACING.xs }}>
                  <AppText size="sm">{alert.message}</AppText>
                  {alert.link ? (
                    <AppText size="xs" weight="semibold" tone="primary">
                      {t("alerts.learnMore")}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
