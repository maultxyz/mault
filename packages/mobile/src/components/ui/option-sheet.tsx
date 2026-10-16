import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { OptionSheetProps } from "@/lib/interfaces/ui";

export function OptionSheet({ visible, title, options, selected, multiple = false, onSelect, onClose }: OptionSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SCREEN_GUTTER,
            paddingVertical: SPACING.md,
          }}
        >
          <AppText size="base" weight="semibold" style={{ flexShrink: 1 }}>
            {title}
          </AppText>
          {multiple ? <Button size="sm" variant="ghost" label={t("common.done")} onPress={onClose} /> : null}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - SPACING.sm }}>
          {options.map((option) => (
            <ListRow
              key={option.value}
              title={option.label}
              selected={selected.includes(option.value)}
              onPress={() => onSelect(option.value)}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
