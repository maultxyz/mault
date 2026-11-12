import { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "@/components/ui/section-header";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { CollapsibleSectionProps } from "@/lib/interfaces/ui";

export function CollapsibleSection({ title, children, initiallyOpen = false }: CollapsibleSectionProps) {
  const colors = useTheme();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <View style={{ gap: SPACING.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
      >
        <SectionHeader
          title={title}
          action={<Icon name={isOpen ? "collapse" : "expand"} size={16} color={colors.foregroundSecondary} />}
        />
      </Pressable>
      {isOpen ? children : null}
    </View>
  );
}
