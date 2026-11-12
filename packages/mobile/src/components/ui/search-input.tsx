import { TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_PADDING_HORIZONTAL, CONTROL_RADIUS, FONT_FAMILY, FONT_SIZE } from "@/lib/constants/theme";
import { SEARCH_INPUT_HEIGHT } from "@/lib/constants/ui";
import type { SearchInputProps } from "@/lib/interfaces/ui";

export function SearchInput({ value, onChangeText, placeholder, accessibilityLabel }: SearchInputProps) {
  const colors = useTheme();
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
        clearButtonMode="while-editing"
        style={{
          height: SEARCH_INPUT_HEIGHT,
          borderRadius: CONTROL_RADIUS,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.inputBackground,
          color: colors.foreground,
          paddingLeft: CONTROL_PADDING_HORIZONTAL + 28,
          paddingRight: CONTROL_PADDING_HORIZONTAL,
          paddingVertical: 0,
          fontSize: FONT_SIZE.base,
          fontFamily: FONT_FAMILY.regular,
        }}
      />
    </View>
  );
}
