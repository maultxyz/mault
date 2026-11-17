import { collectionCsvFormatLabel, parseCollectionCsv } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { useToast } from "@/components/ui/toast-provider";
import { importCollectionCsv, previewCollectionCsvImport } from "@/features/collections/api/collections";
import { useTheme } from "@/hooks/use-theme";
import { COLLECTION_CSV_IMPORT_MIME_TYPES } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { CollectionCsvImportFile } from "@/lib/interfaces/collections";

export default function CollectionCsvImportScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [file, setFile] = useState<CollectionCsvImportFile | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const preview = useMutation({
    mutationFn: (parsed: CollectionCsvImportFile["parsed"]) => previewCollectionCsvImport(guid, { rows: parsed.rows }),
  });
  const importRows = useMutation({
    mutationFn: (parsed: CollectionCsvImportFile["parsed"]) => importCollectionCsv(guid, { rows: parsed.rows }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.back();
      showToast({ message: t("collections.importCsv.imported", { count: result.importedCopies }), tone: "success" });
    },
  });
  const previewResult = preview.data;

  const pickFile = async () => {
    setReadFailed(false);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: COLLECTION_CSV_IMPORT_MIME_TYPES, copyToCacheDirectory: true });
      const asset = picked.canceled ? null : picked.assets[0];
      if (!asset) return;
      const parsed = parseCollectionCsv(await new File(asset.uri).text());
      preview.reset();
      importRows.reset();
      setFile({ fileName: asset.name, parsed });
      if (parsed.hasNameColumn && parsed.rows.length > 0) preview.mutate(parsed);
    } catch {
      setReadFailed(true);
    }
  };

  const formatLabel = file ? (collectionCsvFormatLabel(file.parsed.format) ?? t("collections.importCsv.genericFormat")) : "";

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("collections.importCsv.title")} subtitle={t("collections.importCsv.description")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("collections.importCsv.import", { count: previewResult?.matchedCopies ?? 0 })}
            loading={importRows.isPending}
            disabled={!file || !previewResult || previewResult.matchedCopies === 0 || preview.isPending}
            onPress={() => file && importRows.mutate(file.parsed)}
          />
        }
      >
        <Button
          variant="secondary"
          icon="upload"
          label={file ? t("collections.importCsv.chooseAnother") : t("collections.importCsv.chooseFile")}
          onPress={() => void pickFile()}
        />
        {readFailed ? <Callout tone="destructive" title={t("collections.importCsv.readFailed")} /> : null}
        {importRows.isError ? (
          <Callout tone="destructive" title={importRows.error.message || t("collections.importCsv.failed")} />
        ) : null}
        {file ? (
          <View style={{ gap: SPACING.md }}>
            <AppText tone="secondary" numberOfLines={1}>
              {file.fileName}
            </AppText>
            {!file.parsed.hasNameColumn ? (
              <Callout tone="destructive" title={t("collections.importCsv.noNameColumn")} />
            ) : file.parsed.rows.length === 0 ? (
              <Callout tone="destructive" title={t("collections.importCsv.emptyFile")} />
            ) : (
              <>
                <AppText tone="secondary" accessibilityLiveRegion="polite">
                  {[
                    t("collections.importCsv.detectedFormat", { format: formatLabel }),
                    file.parsed.skippedRows > 0 ? t("collections.importCsv.skipped", { count: file.parsed.skippedRows }) : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </AppText>
                {preview.isPending ? <PageSkeleton sections={1} /> : null}
                {preview.isError ? (
                  <Callout tone="destructive" title={preview.error.message || t("collections.importCsv.previewFailed")} />
                ) : null}
                {previewResult ? (
                  <>
                    <AppText size="base" weight="semibold" accessibilityLiveRegion="polite">
                      {t("collections.importCsv.matched", { count: previewResult.matchedCopies })}
                    </AppText>
                    {previewResult.unmatchedRowCount > 0 ? (
                      <>
                        <Callout
                          tone="warning"
                          title={t("collections.importCsv.unmatchedTitle", { count: previewResult.unmatchedRowCount })}
                        />
                        <ListGroup>
                          {previewResult.unmatchedRows.map((row) => (
                            <ListRow
                              key={row.lineNumber}
                              title={row.name}
                              subtitle={t("collections.importCsv.unmatchedLine", {
                                line: row.lineNumber,
                                quantity: row.quantity,
                                name: [row.setCode, row.collectorNumber].filter(Boolean).join(" ") || row.name,
                              })}
                            />
                          ))}
                        </ListGroup>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </PinnedActionsLayout>
    </View>
  );
}
