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
import { IOS_HEADER_BAR_ICON_BUTTON_SIZE, IOS_ICON_BUTTON_STYLES, PAGE_HEADER_ICON_BUTTON_SIZE } from "@/lib/constants/ui";
import { useIsInHeaderBar } from "@/lib/header-bar-item-context";
import type { IconButtonProps } from "@/lib/interfaces/ui";

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "neutral",
  size: requestedSize = PAGE_HEADER_ICON_BUTTON_SIZE,
  disabled = false,
  selected,
}: IconButtonProps) {
  const colors = useTheme();
  const isInHeaderBar = useIsInHeaderBar();
  const size = isInHeaderBar ? IOS_HEADER_BAR_ICON_BUTTON_SIZE : requestedSize;
  const style = isInHeaderBar && variant === "neutral" ? "borderless" : IOS_ICON_BUTTON_STYLES[variant];
  const appearance = {
    neutral: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
    primary: { tintColor: colors.primary, foregroundColor: colors.primaryForeground },
    plain: { tintColor: colors.primaryText, foregroundColor: colors.foreground },
    camera: { tintColor: colors.onCamera, foregroundColor: colors.onCamera },
  }[variant];

  return (
    <Host alignment="center" style={{ width: size, height: size }}>
      <SwiftUIButton
        onPress={disabled ? undefined : onPress}
        modifiers={[
          buttonStyle(style),
          buttonBorderShape("circle"),
          tint(appearance.tintColor),
          disabledModifier(disabled),
          accessibilityLabelModifier(accessibilityLabel),
          ...(selected ? [accessibilityAddTraits(["isSelected"])] : []),
        ]}
      >
        <Image
          systemName={IOS_SYMBOLS[icon]}
          size={Math.round(size * (isInHeaderBar ? 0.5 : 0.45))}
          modifiers={[
            frame({ maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }),
            foregroundStyle(disabled ? colors.foregroundSecondary : appearance.foregroundColor),
          ]}
        />
      </SwiftUIButton>
    </Host>
  );
}
