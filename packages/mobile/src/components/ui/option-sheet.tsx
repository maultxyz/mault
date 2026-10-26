import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { ListRow } from "@/components/ui/list-row";
import { SearchInput } from "@/components/ui/search-input";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { OptionSheetProps } from "@/lib/interfaces/ui";

export function OptionSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchPlaceholder,
  maxVisibleOptions,
}: OptionSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? options.filter(
          (option) => option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
        )
      : options;
    return maxVisibleOptions ? matches.slice(0, maxVisibleOptions) : matches;
  }, [options, query, maxVisibleOptions]);
  const close = () => {
    setQuery("");
    onClose();
  };
  const select = (value: string) => {
    setQuery("");
    onSelect(value);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={close} style={{ flex: 1, backgroundColor: colors.overlay }} />
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
        </View>
        {searchPlaceholder ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.sm }}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              accessibilityLabel={searchPlaceholder}
            />
          </View>
        ) : null}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - SPACING.sm }}
        >
          {visibleOptions.map((option) => (
            <ListRow
              key={option.value}
              title={option.label}
              selected={selected.includes(option.value)}
              onPress={() => select(option.value)}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
