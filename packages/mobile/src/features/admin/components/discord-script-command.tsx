import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { DiscordScriptCommandProps } from "@/lib/interfaces/admin-discord";

export function DiscordScriptCommand({ command, description }: DiscordScriptCommandProps) {
  const colors = useTheme();
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <AppText size="xs" tone="secondary">
        {description}
      </AppText>
      <View
        style={{
          borderRadius: RADIUS.md,
          backgroundColor: colors.muted,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
        }}
      >
        <AppText size="xs" mono selectable>
          {command}
        </AppText>
      </View>
    </View>
  );
}
