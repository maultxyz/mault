import { Pressable, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_PADDING_HORIZONTAL, CONTROL_RADIUS, FONT_FAMILY, FONT_SIZE } from "@/lib/constants/theme";
import { SEARCH_INPUT_CLEAR_BUTTON_HIT_SLOP, SEARCH_INPUT_HEIGHT } from "@/lib/constants/ui";
import type { SearchInputProps } from "@/lib/interfaces/ui";

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onClear,
  clearAccessibilityLabel,
}: SearchInputProps) {
  const colors = useTheme();
  const showsClearButton = !!onClear && value.length > 0;
  return (
    <View style={{ justifyContent: "center" }}>
      <View pointerEvents="none" style={{ position: "absolute", left: CONTROL_PADDING_HORIZONTAL + 2, zIndex: 1 }}>
        <Icon name="search" size={16} color={colors.foregroundSecondary} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode={onClear ? "never" : "while-editing"}
        style={{
          height: SEARCH_INPUT_HEIGHT,
          borderRadius: CONTROL_RADIUS,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.inputBackground,
          color: colors.foreground,
          paddingLeft: CONTROL_PADDING_HORIZONTAL + 28,
          paddingRight: showsClearButton ? CONTROL_PADDING_HORIZONTAL + 28 : CONTROL_PADDING_HORIZONTAL,
          paddingVertical: 0,
          fontSize: FONT_SIZE.base,
          fontFamily: FONT_FAMILY.regular,
        }}
      />
      {showsClearButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          hitSlop={SEARCH_INPUT_CLEAR_BUTTON_HIT_SLOP}
          onPress={onClear}
          style={{ position: "absolute", right: CONTROL_PADDING_HORIZONTAL, padding: 2 }}
        >
          <Icon name="dismiss" size={18} color={colors.foregroundSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
