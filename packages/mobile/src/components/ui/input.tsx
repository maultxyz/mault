import { TextInput } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, INPUT_HEIGHT } from "@/lib/constants/ui";
import type { InputProps } from "@/lib/interfaces/ui";

export function Input({ editable = true, compact = false, ...props }: InputProps) {
  const colors = useTheme();
  return (
    <TextInput
      {...props}
      editable={editable}
      placeholderTextColor={colors.mutedForeground}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        flexGrow: compact ? 0 : 1,
        flexShrink: compact ? 0 : 1,
        minWidth: 96,
        width: compact ? 96 : undefined,
        textAlign: compact ? "right" : "left",
        height: INPUT_HEIGHT,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.input,
        backgroundColor: colors.inputBackground,
        color: colors.foreground,
        paddingHorizontal: SPACING.md,
        paddingVertical: 0,
        fontSize: FONT_SIZE.base,
        fontFamily: FONT_FAMILY.regular,
        opacity: editable ? 1 : DISABLED_OPACITY,
      }}
    />
  );
}
