import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Pill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet } from "@/components/ui/sheet";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
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
  emptyMessage,
}: OptionSheetProps) {
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
    <Sheet visible={visible} onClose={close} title={title} scrollable={false}>
      {searchPlaceholder && options.length > 0 ? (
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
        style={{ flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER }}
      >
        {options.length === 0 && emptyMessage ? (
          <AppText tone="secondary" style={{ paddingBottom: SPACING.md }}>
            {emptyMessage}
          </AppText>
        ) : null}
        <ListGroup>
          {visibleOptions.map((option) => (
            <ListRow
              key={option.value}
              title={option.label}
              right={option.badge ? <Pill label={option.badge} /> : undefined}
              selected={selected.includes(option.value)}
              onPress={() => select(option.value)}
            />
          ))}
        </ListGroup>
      </ScrollView>
    </Sheet>
  );
}
