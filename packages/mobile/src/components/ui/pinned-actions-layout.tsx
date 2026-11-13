import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { PinnedActionsLayoutProps } from "@/lib/interfaces/ui";

export function PinnedActionsLayout({ children, actions, actionsDirection = "column" }: PinnedActionsLayoutProps) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.xl }}
      >
        {children}
      </ScrollView>
      {actions ? <BottomActionBar direction={actionsDirection}>{actions}</BottomActionBar> : null}
    </KeyboardAvoidingView>
  );
}
