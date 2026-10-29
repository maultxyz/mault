import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { SessionScansSheetProps } from "@/lib/interfaces/scanner";
import { absoluteUrl } from "@/lib/url";

export function SessionScansSheet({ visible, entries, collectionGuid, onClose }: SessionScansSheetProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          maxHeight: "80%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
          paddingBottom: insets.bottom + SPACING.sm,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.sm,
            paddingHorizontal: SCREEN_GUTTER,
            paddingVertical: SPACING.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText size="lg" heading weight="bold">
              {t("scan.sessionScans.title")}
            </AppText>
            <AppText size="sm" tone="secondary">
              {t("scan.sessionCount", { count: entries.length })}
            </AppText>
          </View>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.scanId}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - SPACING.sm, paddingBottom: SPACING.md }}
          ListEmptyComponent={
            <AppText tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
              {t("scan.sessionScans.empty")}
            </AppText>
          }
          renderItem={({ item }) => {
            const price = item.card ? pricing.priceOf(item.card) : null;
            const time = new Date(item.scannedAt).toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" });
            return (
              <CardRow
                name={item.card?.name ?? t("scan.sessionScans.noMatch")}
                subtitle={[
                  item.binNumber != null ? t("scan.sessionScans.bin", { number: item.binNumber }) : null,
                  item.card?.setName,
                  time,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                imageUrl={absoluteUrl(item.card?.image?.small ?? item.capturedImageUrl)}
                price={price != null ? pricing.format(price) : null}
                lowConfidence={item.lowConfidence}
                onPress={
                  item.card && collectionGuid
                    ? () => {
                        onClose();
                        router.push({ pathname: "/card/[scanId]", params: { scanId: item.scanId, guid: collectionGuid } });
                      }
                    : undefined
                }
              />
            );
          }}
        />
      </View>
    </Modal>
  );
}
