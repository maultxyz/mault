import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Sheet } from "@/components/ui/sheet";
import { usePricing } from "@/hooks/use-pricing";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { SessionScansSheetProps } from "@/lib/interfaces/scanner";
import { absoluteUrl } from "@/lib/url";

export function SessionScansSheet({ visible, entries, collectionGuid, onClose }: SessionScansSheetProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("scan.sessionScans.title")}
      description={t("scan.sessionCount", { count: entries.length })}
      scrollable={false}
    >
      <FlatList
        style={{ flexShrink: 1 }}
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
    </Sheet>
  );
}
