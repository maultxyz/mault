import { useTranslation } from "react-i18next";
import { Modal, ScrollView, View } from "react-native";
import { PageHeader } from "@/components/ui/page-header";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { BatchScanCorrectionSheetProps } from "@/lib/interfaces/scanner";

export function BatchScanCorrectionSheet({ card, collectionGuid, onSelect, onClose }: BatchScanCorrectionSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const currentName = card?.correctedCard?.name ?? card?.outcome?.card?.name ?? "";

  return (
    <Modal visible={!!card} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <PageHeader title={t("batchScan.pickCard")} subtitle={currentName || null} onBack={onClose} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: SPACING.xxl }}
        >
          {card ? (
            <CardCorrectionSearch key={card.key} collectionGuid={collectionGuid} initialQuery={currentName} onSelect={onSelect} />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
