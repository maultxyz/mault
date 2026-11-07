import { Button as SwiftUIButton, Host, Image } from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityLabel as accessibilityLabelModifier,
  buttonBorderShape,
  buttonStyle,
  disabled as disabledModifier,
  foregroundStyle,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "@/hooks/use-theme";
import { IOS_SYMBOLS } from "@/lib/constants/ios-symbols";
import { DISABLED_OPACITY, IOS_ICON_BUTTON_STYLES, PAGE_HEADER_ICON_BUTTON_SIZE } from "@/lib/constants/ui";
import type { IconButtonProps } from "@/lib/interfaces/ui";

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "neutral",
  size = PAGE_HEADER_ICON_BUTTON_SIZE,
  disabled = false,
  selected,
}: IconButtonProps) {
  const colors = useTheme();
  const appearance = {
    neutral: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
    primary: { tintColor: colors.primary, foregroundColor: colors.primaryForeground },
    plain: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
    camera: { tintColor: colors.onCamera, foregroundColor: colors.onCamera },
  }[variant];

  return (
    <Host style={{ width: size, height: size, opacity: disabled ? DISABLED_OPACITY : 1 }}>
      <SwiftUIButton
        onPress={disabled ? undefined : onPress}
        modifiers={[
          buttonStyle(IOS_ICON_BUTTON_STYLES[variant]),
          buttonBorderShape("circle"),
          tint(appearance.tintColor),
          disabledModifier(disabled),
          accessibilityLabelModifier(accessibilityLabel),
          ...(selected ? [accessibilityAddTraits(["isSelected"])] : []),
        ]}
      >
        <Image
          systemName={IOS_SYMBOLS[icon]}
          size={Math.round(size * 0.45)}
          modifiers={[
            frame({ maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }),
            foregroundStyle(appearance.foregroundColor),
          ]}
        />
      </SwiftUIButton>
    </Host>
  );
}
