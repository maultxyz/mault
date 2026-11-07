import { Button as MaterialButton, FilledTonalButton, Host, TextButton } from "@expo/ui/jetpack-compose";
import { fillMaxSize, semantics } from "@expo/ui/jetpack-compose/modifiers";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS, DISABLED_OPACITY } from "@/lib/constants/ui";
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
    primary: { MaterialComponent: MaterialButton, container: colors.primary, content: colors.primaryForeground },
    secondary: { MaterialComponent: FilledTonalButton, container: colors.tonal, content: colors.foreground },
    destructive: { MaterialComponent: FilledTonalButton, container: colors.destructiveTint, content: colors.destructiveForeground },
    ghost: { MaterialComponent: TextButton, container: "transparent", content: colors.foreground },
  }[variant];
  const { MaterialComponent } = appearance;
  const inactive = disabled || loading;

  return (
    <View
      style={[
        {
          minHeight: BUTTON_HEIGHTS[size],
          paddingHorizontal: size === "sm" ? SPACING.md + 2 : SPACING.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: inactive ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      <Host style={StyleSheet.absoluteFill}>
        <MaterialComponent
          onClick={onPress}
          enabled={!inactive}
          colors={{
            containerColor: appearance.container,
            contentColor: appearance.content,
            disabledContainerColor: appearance.container,
            disabledContentColor: appearance.content,
          }}
          modifiers={[
            fillMaxSize(),
            semantics({ contentDescription: [accessibilityLabel ?? label, accessibilityHint].filter(Boolean).join(". ") }),
          ]}
        >
          {null}
        </MaterialComponent>
      </Host>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs + 2, flexShrink: 1 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={appearance.content} />
        ) : icon ? (
          <Icon name={icon} size={iconOnly ? 20 : 16} color={appearance.content} />
        ) : null}
        {iconOnly ? null : (
          <AppText size={size === "lg" ? "base" : "sm"} weight="semibold" numberOfLines={1} style={{ color: appearance.content }}>
            {label}
          </AppText>
        )}
      </View>
    </View>
  );
}
