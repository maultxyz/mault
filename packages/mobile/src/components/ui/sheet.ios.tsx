import { BottomSheet, Group, Host, Rectangle, RNHostView } from "@expo/ui/swift-ui";
import { foregroundStyle, preferredColorScheme, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import { useColorScheme } from "react-native";
import { SheetContent } from "@/components/ui/sheet-content";
import { useTheme } from "@/hooks/use-theme";
import { IOS_SHEET_TOP_PADDING } from "@/lib/constants/ui";
import type { SheetProps } from "@/lib/interfaces/ui";
import { useQueuedSheetPresentation } from "@/lib/sheet-presentation";

export function Sheet({ visible, onClose, ...contentProps }: SheetProps) {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  const { isPresented, onSheetDismissed } = useQueuedSheetPresentation(visible);
  return (
    <Host style={{ position: "absolute", width: 0, height: 0 }}>
      <BottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(nextIsPresented) => {
          if (!nextIsPresented && visible) onClose();
        }}
        onDismiss={onSheetDismissed}
        fitToContents
        presentationBackground={<Rectangle modifiers={[foregroundStyle(colors.background)]} />}
      >
        <Group
          modifiers={[
            presentationDragIndicator("visible"),
            preferredColorScheme(colorScheme === "dark" ? "dark" : "light"),
          ]}
        >
          <RNHostView matchContents={{ vertical: true }}>
            <SheetContent {...contentProps} topPadding={IOS_SHEET_TOP_PADDING} />
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}
