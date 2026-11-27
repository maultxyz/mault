import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Platform, Pressable, TextInput, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_PADDING_HORIZONTAL, CONTROL_RADIUS, FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { INPUT_HEIGHT, MIN_TOUCH_TARGET, MULTILINE_INPUT_MIN_HEIGHT } from "@/lib/constants/ui";
import type { TextFieldProps } from "@/lib/interfaces/ui";

export function TextField({ label, error, autoComplete, multiline, prefix, secureTextEntry, inputRef, ...props }: TextFieldProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [isSecureTextRevealed, setIsSecureTextRevealed] = useState(false);
  useEffect(() => {
    if (error && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(error);
  }, [error]);
  const isInsideRow = !!prefix || !!secureTextEntry;
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
      ref={inputRef}
      accessibilityLabel={label}
      accessibilityHint={error}
      autoComplete={autoComplete}
      multiline={multiline}
      secureTextEntry={secureTextEntry && !isSecureTextRevealed}
      placeholderTextColor={colors.mutedForeground}
      style={
        isInsideRow
          ? { ...textStyle, flex: 1, minHeight: INPUT_HEIGHT - 2 }
          : { ...boxStyle, ...textStyle, ...(multiline ? { textAlignVertical: "top" as const } : null) }
      }
    />
  );
  const revealActionLabel = isSecureTextRevealed ? t("common.hide") : t("common.show");
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <AppText size="xs" weight="medium">
        {label}
      </AppText>
      {isInsideRow ? (
        <View
          style={{
            ...boxStyle,
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            ...(secureTextEntry ? { paddingRight: 0 } : null),
          }}
        >
          {prefix ? (
            <AppText size="base" tone="secondary" importantForAccessibility="no" accessibilityElementsHidden>
              {prefix}
            </AppText>
          ) : null}
          {input}
          {secureTextEntry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${revealActionLabel}: ${label}`}
              accessibilityState={{ expanded: isSecureTextRevealed }}
              onPress={() => setIsSecureTextRevealed((isRevealed) => !isRevealed)}
              style={({ pressed }) => ({
                minWidth: MIN_TOUCH_TARGET,
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: CONTROL_PADDING_HORIZONTAL,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText size="sm" weight="medium" tone="primary">
                {revealActionLabel}
              </AppText>
            </Pressable>
          ) : null}
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
