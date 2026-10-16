import { TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { SEARCH_INPUT_HEIGHT } from "@/lib/constants/ui";
import type { SearchInputProps } from "@/lib/interfaces/ui";

export function SearchInput({ value, onChangeText, placeholder, accessibilityLabel }: SearchInputProps) {
  const colors = useTheme();
  return (
    <View style={{ justifyContent: "center" }}>
      <View pointerEvents="none" style={{ position: "absolute", left: SPACING.md + 2, zIndex: 1 }}>
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
          borderRadius: RADIUS.full,
          backgroundColor: colors.muted,
          color: colors.foreground,
          paddingLeft: 40,
          paddingRight: SPACING.md,
          paddingVertical: 0,
          fontSize: FONT_SIZE.base,
          fontFamily: FONT_FAMILY.regular,
        }}
      />
    </View>
  );
}
