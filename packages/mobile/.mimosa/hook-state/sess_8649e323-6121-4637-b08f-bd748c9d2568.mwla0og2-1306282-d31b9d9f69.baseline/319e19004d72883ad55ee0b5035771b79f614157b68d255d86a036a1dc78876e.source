import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { SheetContent } from "@/components/ui/sheet-content";
import { useTheme } from "@/hooks/use-theme";
import { ANDROID_SHEET_TOP_PADDING } from "@/lib/constants/ui";
import type { SheetProps } from "@/lib/interfaces/ui";

export function Sheet({ visible, onClose, ...contentProps }: SheetProps) {
  const colors = useTheme();
  if (!visible) return null;
  return (
    <Host style={{ position: "absolute", width: 0, height: 0 }}>
      <ModalBottomSheet
        onDismissRequest={onClose}
        containerColor={colors.background}
        contentColor={colors.foreground}
        scrimColor={colors.overlay}
      >
        <RNHostView matchContents={{ vertical: true }}>
          <SheetContent {...contentProps} topPadding={ANDROID_SHEET_TOP_PADDING} />
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
