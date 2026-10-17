import { TextInput, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { INPUT_HEIGHT } from "@/lib/constants/ui";
import type { TextFieldProps } from "@/lib/interfaces/ui";

export function TextField({ label, error, autoComplete, ...props }: TextFieldProps) {
  const colors = useTheme();
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <AppText size="xs" weight="medium">
        {label}
      </AppText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoComplete={autoComplete}
        placeholderTextColor={colors.mutedForeground}
        style={{
          height: INPUT_HEIGHT,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: error ? colors.destructive : colors.input,
          backgroundColor: colors.inputBackground,
          color: colors.foreground,
          paddingHorizontal: SPACING.md,
          fontSize: FONT_SIZE.base,
          fontFamily: FONT_FAMILY.regular,
        }}
      />
      {error ? (
        <AppText size="xs" style={{ color: colors.destructive }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
