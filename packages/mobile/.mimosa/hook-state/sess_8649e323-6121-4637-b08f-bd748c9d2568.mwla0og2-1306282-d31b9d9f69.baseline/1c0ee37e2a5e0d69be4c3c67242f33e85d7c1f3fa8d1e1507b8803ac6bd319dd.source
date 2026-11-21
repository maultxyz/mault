import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, View } from "react-native";
import { scanIdsToRemove, selectableRemovalCopies, selectedRemovalCopy } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Sheet } from "@/components/ui/sheet";
import { Surface } from "@/components/ui/surface";
import { describeRemovalCopy } from "@/features/scanner/lib/scan-removal";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ScanRemovalQueueSheetProps } from "@/lib/interfaces/scanner";
import { absoluteUrl } from "@/lib/url";

export function ScanRemovalQueueSheet({
  visible,
  removal,
  collectionName,
  onClose,
  onRemoved,
}: ScanRemovalQueueSheetProps) {
  const { t } = useTranslation();
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
              .then(() => {
                onClose();
                onRemoved?.(removableCount);
              })
              .catch(() => Alert.alert(t("scan.removal.removeFailed")));
          },
        },
      ],
    );

  return (
    <>
      <Sheet
        visible={visible && copyPickerEntry == null}
        onClose={onClose}
        title={t("scan.removal.title", { collection: collectionName })}
        description={t("scan.removal.queued", { count: removal.entries.length })}
        scrollable={false}
        footer={
          <Button
            label={t("scan.removal.removeAction", { count: removableCount })}
            variant="destructive"
            icon="trash"
            loading={removal.isRemovingQueuedCopies}
            disabled={removableCount === 0}
            onPress={confirmRemoveQueuedCopies}
          />
        }
      >
        <FlatList
          data={removal.entries}
          keyExtractor={(entry) => entry.entryId}
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.md, gap: SPACING.sm }}
          ListEmptyComponent={<EmptyState icon="trash" title={t("scan.removal.empty")} />}
          renderItem={({ item: entry }) => {
            const queuedCopy = selectedRemovalCopy(entry);
            const canChangeCopy = selectableRemovalCopies(entry, removal.entries).some(
              (copy) => copy.scanId !== entry.selectedScanId,
            );
            return (
              <Surface padded={false} style={{ gap: SPACING.xs, paddingBottom: SPACING.md }}>
                <CardRow
                  name={entry.matchedCard.name}
                  subtitle={entry.matchedCard.setName}
                  imageUrl={absoluteUrl(entry.matchedCard.image?.small)}
                />
                <AppText
                  size="xs"
                  tone={queuedCopy ? "secondary" : "warning"}
                  numberOfLines={2}
                  style={{ paddingHorizontal: SCREEN_GUTTER }}
                >
                  {queuedCopy ? describeRemovalCopy(queuedCopy, t) : t("scan.removal.noCopyLeft")}
                </AppText>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER }}>
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
              </Surface>
            );
          }}
        />
      </Sheet>
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
