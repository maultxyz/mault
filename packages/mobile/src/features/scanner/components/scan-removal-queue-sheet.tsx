import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scanIdsToRemove, selectableRemovalCopies, selectedRemovalCopy } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { describeRemovalCopy } from "@/features/scanner/lib/scan-removal";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ScanRemovalQueueSheetProps } from "@/lib/interfaces/scanner";
import { absoluteUrl } from "@/lib/url";

export function ScanRemovalQueueSheet({ visible, removal, collectionName, onClose }: ScanRemovalQueueSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [copyPickerEntryId, setCopyPickerEntryId] = useState<string | null>(null);
  const copyPickerEntry = removal.entries.find((entry) => entry.entryId === copyPickerEntryId) ?? null;
  const removableCount = scanIdsToRemove(removal.entries).length;

  const confirmRemoveQueuedCopies = () =>
    Alert.alert(
      t("scan.removal.removeAction", { count: removableCount }),
      t("scan.removal.confirmDescription", { collection: collectionName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("cardDetail.remove"),
          style: "destructive",
          onPress: () => {
            void removal
              .removeQueuedCopies()
              .then(onClose)
              .catch(() => Alert.alert(t("scan.removal.removeFailed")));
          },
        },
      ],
    );

  return (
    <>
      <Modal
        visible={visible && copyPickerEntry == null}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
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
            paddingBottom: insets.bottom + SPACING.md,
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText size="lg" heading weight="bold" numberOfLines={1}>
                {t("scan.removal.title", { collection: collectionName })}
              </AppText>
              <AppText size="sm" tone="secondary">
                {t("scan.removal.queued", { count: removal.entries.length })}
              </AppText>
            </View>
            <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
          </View>
          <FlatList
            data={removal.entries}
            keyExtractor={(entry) => entry.entryId}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - SPACING.sm, paddingBottom: SPACING.md }}
            ListEmptyComponent={
              <AppText tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
                {t("scan.removal.empty")}
              </AppText>
            }
            renderItem={({ item: entry }) => {
              const queuedCopy = selectedRemovalCopy(entry);
              const canChangeCopy = selectableRemovalCopies(entry, removal.entries).some(
                (copy) => copy.scanId !== entry.selectedScanId,
              );
              return (
                <View style={{ gap: SPACING.xs, paddingBottom: SPACING.sm }}>
                  <CardRow
                    name={entry.matchedCard.name}
                    subtitle={entry.matchedCard.setName}
                    imageUrl={absoluteUrl(entry.matchedCard.image?.small)}
                  />
                  <AppText
                    size="xs"
                    tone={queuedCopy ? "secondary" : "warning"}
                    numberOfLines={2}
                    style={{ paddingHorizontal: SPACING.sm }}
                  >
                    {queuedCopy ? describeRemovalCopy(queuedCopy, t) : t("scan.removal.noCopyLeft")}
                  </AppText>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, paddingHorizontal: SPACING.sm }}>
                    <Button
                      label={t("scan.removal.changeCopy")}
                      variant="secondary"
                      size="sm"
                      disabled={!canChangeCopy || removal.isRemovingQueuedCopies}
                      onPress={() => setCopyPickerEntryId(entry.entryId)}
                    />
                    <Button
                      label={t("scan.removal.drop")}
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      disabled={removal.isRemovingQueuedCopies}
                      onPress={() => removal.dropEntry(entry.entryId)}
                    />
                  </View>
                </View>
              );
            }}
          />
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm }}>
            <Button
              label={t("scan.removal.removeAction", { count: removableCount })}
              variant="destructive"
              icon="trash"
              loading={removal.isRemovingQueuedCopies}
              disabled={removableCount === 0}
              onPress={confirmRemoveQueuedCopies}
            />
          </View>
        </View>
      </Modal>
      <OptionSheet
        visible={visible && copyPickerEntry != null}
        title={t("scan.removal.changeCopy")}
        options={
          copyPickerEntry
            ? selectableRemovalCopies(copyPickerEntry, removal.entries).map((copy) => ({
                value: copy.scanId,
                label: describeRemovalCopy(copy, t),
              }))
            : []
        }
        selected={copyPickerEntry?.selectedScanId ? [copyPickerEntry.selectedScanId] : []}
        onSelect={(scanId) => {
          if (copyPickerEntry) removal.selectCopyForEntry(copyPickerEntry.entryId, scanId);
          setCopyPickerEntryId(null);
        }}
        onClose={() => setCopyPickerEntryId(null)}
      />
    </>
  );
}
