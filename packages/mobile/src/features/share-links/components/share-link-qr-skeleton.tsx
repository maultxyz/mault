import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { QR_CODE_MAX_SIZE } from "@/lib/constants/share-links";
import { CONTROL_RADIUS, RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export function ShareLinkQrSkeleton() {
  const colors = useTheme();
  const panelWidth = usePanelWidth();
  const qrSize = Math.min(panelWidth - SCREEN_GUTTER * 2, QR_CODE_MAX_SIZE);
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ alignItems: "center", gap: SPACING.xs }}>
        <Skeleton width={qrSize} height={qrSize} radius={RADIUS.md} />
        <TextLineSkeleton size="xs" width="50%" />
      </View>
      <View
        style={{
          borderRadius: CONTROL_RADIUS,
          borderWidth: 1,
          borderColor: colors.input,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          gap: 2,
        }}
      >
        <TextLineSkeleton size="sm" width="85%" />
        <TextLineSkeleton size="xs" width="45%" />
      </View>
    </View>
  );
}
