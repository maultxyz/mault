import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SwitchRow } from "@/components/ui/switch-row";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { ExportSheetProps } from "@/lib/interfaces/cards";

export function ExportSheet({
  visible,
  title,
  adapters,
  loading,
  exporting,
  failed,
  combineDuplicates,
  onCombineDuplicatesChange,
  onExport,
  onClose,
}: ExportSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
          paddingBottom: insets.bottom + SPACING.md,
          gap: SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER }}>
          <AppText size="lg" heading weight="bold" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </AppText>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}>
          {failed ? <Callout tone="destructive" title={t("export.failed")} /> : null}
          <SwitchRow
            title={t("export.combineDuplicates")}
            value={combineDuplicates}
            onValueChange={onCombineDuplicatesChange}
          />
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.md }}>
              <ActivityIndicator color={colors.foreground} />
              <AppText size="sm" tone="secondary">
                {t("export.loading")}
              </AppText>
            </View>
          ) : (
            <ListGroup>
              {adapters.map((adapter) => (
                <ListRow
                  key={adapter.key}
                  icon="upload"
                  title={adapter.label}
                  disabled={exporting}
                  onPress={() => onExport(adapter)}
                />
              ))}
            </ListGroup>
          )}
        </View>
      </View>
    </Modal>
  );
}
