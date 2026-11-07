import {
  Button as SwiftUIButton,
  HStack,
  Host,
  Image,
  ProgressView,
  Text as SwiftUIText,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint as accessibilityHintModifier,
  accessibilityLabel as accessibilityLabelModifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  foregroundStyle,
  frame,
  lineLimit,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { IOS_SYMBOLS } from "@/lib/constants/ios-symbols";
import { SPACING } from "@/lib/constants/theme";
import {
  BUTTON_HEIGHTS,
  DISABLED_OPACITY,
  IOS_BUTTON_CONTROL_SIZES,
  IOS_BUTTON_ICON_SIZE,
  IOS_BUTTON_LABEL_FONT_SIZES,
  IOS_BUTTON_STYLES,
} from "@/lib/constants/ui";
import type { ButtonProps } from "@/lib/interfaces/ui";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  size = "md",
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const colors = useTheme();
  const appearance = {
    primary: { tintColor: colors.primary, foregroundColor: colors.primaryForeground },
    secondary: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
    destructive: { tintColor: colors.destructiveForeground, foregroundColor: colors.destructiveForeground },
    ghost: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
  }[variant];
  const inactive = disabled || loading;
  const hasLeadingGlyph = loading || !!icon;

  return (
    <View
      style={[
        {
          minHeight: BUTTON_HEIGHTS[size],
          paddingHorizontal: size === "sm" ? SPACING.md + 2 : SPACING.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: SPACING.xs + 2,
          opacity: inactive ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs + 2, opacity: 0, flexShrink: 1 }}
      >
        {hasLeadingGlyph ? <View style={{ width: IOS_BUTTON_ICON_SIZE, height: IOS_BUTTON_ICON_SIZE }} /> : null}
        {iconOnly ? null : (
          <Text numberOfLines={1} style={{ fontSize: IOS_BUTTON_LABEL_FONT_SIZES[size], fontWeight: "600" }}>
            {label}
          </Text>
        )}
      </View>
      <Host style={StyleSheet.absoluteFill}>
        <SwiftUIButton
          role={variant === "destructive" ? "destructive" : "default"}
          onPress={inactive ? undefined : onPress}
          modifiers={[
            buttonStyle(IOS_BUTTON_STYLES[variant]),
            buttonBorderShape("capsule"),
            controlSize(IOS_BUTTON_CONTROL_SIZES[size]),
            tint(appearance.tintColor),
            disabledModifier(inactive),
            accessibilityLabelModifier(accessibilityLabel ?? label),
            ...(accessibilityHint ? [accessibilityHintModifier(accessibilityHint)] : []),
          ]}
        >
          <HStack
            spacing={SPACING.xs + 2}
            modifiers={[
              frame({ maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }),
              foregroundStyle(appearance.foregroundColor),
            ]}
          >
            {loading ? (
              <ProgressView />
            ) : icon ? (
              <Image systemName={IOS_SYMBOLS[icon]} size={IOS_BUTTON_ICON_SIZE} />
            ) : (
              <></>
            )}
            {iconOnly ? <></> : <SwiftUIText modifiers={[lineLimit(1)]}>{label}</SwiftUIText>}
          </HStack>
        </SwiftUIButton>
      </Host>
    </View>
  );
}
