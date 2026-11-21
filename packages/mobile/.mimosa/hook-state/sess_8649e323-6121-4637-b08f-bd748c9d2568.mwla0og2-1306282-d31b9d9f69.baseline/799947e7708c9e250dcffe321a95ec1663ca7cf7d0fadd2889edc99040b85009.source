import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { QrCode } from "@/components/ui/qr-code";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { QR_CODE_MAX_SIZE } from "@/lib/constants/share-links";
import { CONTROL_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import type { ShareLinkQrProps } from "@/lib/interfaces/share-links";

export function ShareLinkQr({ url, expiresAt }: ShareLinkQrProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const panelWidth = usePanelWidth();
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ alignItems: "center", gap: SPACING.xs }}>
        <QrCode
          value={url}
          size={Math.min(panelWidth - SCREEN_GUTTER * 2, QR_CODE_MAX_SIZE)}
          accessibilityLabel={t("shareLink.qrLabel")}
        />
        <AppText size="xs" tone="secondary">
          {t("shareLink.qrHint")}
        </AppText>
      </View>
      <View
        style={{
          borderRadius: CONTROL_RADIUS,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.inputBackground,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          gap: 2,
        }}
      >
        <AppText selectable size="sm" numberOfLines={1} ellipsizeMode="middle">
          {url}
        </AppText>
        <AppText size="xs" tone="secondary">
          {t("shareLink.expiresAt", { date: formatDateTime(expiresAt, i18n.language) })}
        </AppText>
      </View>
    </View>
  );
}
