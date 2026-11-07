import {
  FilledIconButton,
  FilledTonalIconButton,
  Host,
  IconButton as MaterialIconButton,
} from "@expo/ui/jetpack-compose";
import { fillMaxSize, semantics } from "@expo/ui/jetpack-compose/modifiers";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { DISABLED_OPACITY, PAGE_HEADER_ICON_BUTTON_SIZE } from "@/lib/constants/ui";
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
  const { t } = useTranslation();
  const colors = useTheme();
  const appearance = {
    neutral: { MaterialComponent: FilledTonalIconButton, container: colors.tonal, content: colors.foreground },
    primary: { MaterialComponent: FilledIconButton, container: colors.primary, content: colors.primaryForeground },
    plain: { MaterialComponent: MaterialIconButton, container: "transparent", content: colors.foreground },
    camera: { MaterialComponent: FilledTonalIconButton, container: colors.cameraScrim, content: colors.onCamera },
  }[variant];
  const { MaterialComponent } = appearance;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
    >
      <Host style={StyleSheet.absoluteFill}>
        <MaterialComponent
          onClick={onPress}
          enabled={!disabled}
          colors={{
            containerColor: appearance.container,
            contentColor: appearance.content,
            disabledContainerColor: appearance.container,
            disabledContentColor: appearance.content,
          }}
          modifiers={[fillMaxSize(), semantics({ contentDescription: selected ? `${accessibilityLabel}, ${t("common.selected")}` : accessibilityLabel })]}
        >
          {null}
        </MaterialComponent>
      </Host>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Icon name={icon} size={Math.round(size * 0.45)} color={appearance.content} />
      </View>
    </View>
  );
}
