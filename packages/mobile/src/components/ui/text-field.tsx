import { useEffect } from "react";
import { AccessibilityInfo, Platform, TextInput, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_PADDING_HORIZONTAL, CONTROL_RADIUS, FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { INPUT_HEIGHT, MULTILINE_INPUT_MIN_HEIGHT } from "@/lib/constants/ui";
import type { TextFieldProps } from "@/lib/interfaces/ui";

export function TextField({ label, error, autoComplete, multiline, prefix, ...props }: TextFieldProps) {
  const colors = useTheme();
  useEffect(() => {
    if (error && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(error);
  }, [error]);
  const boxStyle = {
    ...(multiline
      ? { minHeight: MULTILINE_INPUT_MIN_HEIGHT, paddingVertical: SPACING.sm }
      : { minHeight: INPUT_HEIGHT }),
    borderRadius: multiline ? RADIUS.md : CONTROL_RADIUS,
    borderWidth: 1,
    borderColor: error ? colors.destructive : colors.input,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: CONTROL_PADDING_HORIZONTAL,
  };
  const textStyle = {
    color: colors.foreground,
    fontSize: FONT_SIZE.base,
    fontFamily: FONT_FAMILY.regular,
  };
  const input = (
    <TextInput
      {...props}
      accessibilityLabel={label}
      accessibilityHint={error}
      autoComplete={autoComplete}
      multiline={multiline}
      placeholderTextColor={colors.mutedForeground}
      style={
        prefix
          ? { ...textStyle, flex: 1, minHeight: INPUT_HEIGHT - 2 }
          : { ...boxStyle, ...textStyle, ...(multiline ? { textAlignVertical: "top" as const } : null) }
      }
    />
  );
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <AppText size="xs" weight="medium">
        {label}
      </AppText>
      {prefix ? (
        <View style={{ ...boxStyle, flexDirection: "row", alignItems: "center", gap: 2 }}>
          <AppText size="base" tone="secondary" importantForAccessibility="no" accessibilityElementsHidden>
            {prefix}
          </AppText>
          {input}
        </View>
      ) : (
        input
      )}
      {error ? (
        <AppText size="xs" accessibilityLiveRegion="polite" style={{ color: colors.destructiveForeground }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
