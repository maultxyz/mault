import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import {
  binRulesExportFilename,
  buildBinRulesExport,
  parseBinRulesExport,
  serializeBinRulesExport,
  uniqueImportedName,
  type BinRulesExport,
} from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { createBinSet } from "@/features/rules/api/bin-sets";
import { presetWorkflowsQueryOptions } from "@/features/rules/api/preset-workflows";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import { BIN_RULES_FILE_MIME_TYPES } from "@/lib/constants/rules";
import type { BinRulesImportOutcome } from "@/lib/interfaces/rules";

export function useBinRulesTransfer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { showToast } = useToast();
  const { collection, gameGuid, sets, activeSet, bins } = useRulesData();
  const gameKey = collection?.game?.key ?? null;

  const currentExport = (): BinRulesExport | null =>
    activeSet ? buildBinRulesExport(activeSet.name, gameKey, bins) : null;

  const copy = useMutation({
    mutationFn: async () => {
      const data = currentExport();
      if (data) await Clipboard.setStringAsync(serializeBinRulesExport(data));
    },
    onSuccess: () => showToast({ message: t("rules.transferFile.copied"), tone: "success" }),
    onError: () => showToast({ message: t("rules.transferFile.copyFailed"), tone: "destructive" }),
  });

  const share = useMutation({
    mutationFn: async () => {
      const data = currentExport();
      if (!data) return;
      const file = new File(Paths.cache, binRulesExportFilename(data));
      if (file.exists) file.delete();
      file.create();
      file.write(serializeBinRulesExport(data));
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: file.name });
    },
    onError: () => showToast({ message: t("rules.transferFile.exportFailed"), tone: "destructive" }),
  });

  const importFile = useMutation({
    mutationFn: async (): Promise<BinRulesImportOutcome> => {
      const picked = await DocumentPicker.getDocumentAsync({ type: BIN_RULES_FILE_MIME_TYPES, copyToCacheDirectory: true });
      const asset = picked.canceled ? null : picked.assets[0];
      if (!asset) return { status: "cancelled" };
      let parsed: BinRulesExport;
      try {
        parsed = parseBinRulesExport(await new File(asset.uri).text());
      } catch {
        return { status: "invalid" };
      }
      if (parsed.gameKey && gameKey && parsed.gameKey !== gameKey) return { status: "wrongGame" };
      const importedBins = parsed.bins.filter((bin) => bin.binNumber <= bins.length);
      const name = uniqueImportedName(parsed.name, sets, t("rules.transferFile.importedSuffix"));
      const next = await createBinSet(name, gameGuid, importedBins);
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      void queryClient.invalidateQueries({ queryKey: presetWorkflowsQueryOptions(orgId).queryKey });
      return { status: "imported", name, skippedBinCount: parsed.bins.length - importedBins.length };
    },
    onSuccess: (outcome) => {
      if (outcome.status === "cancelled") return;
      if (outcome.status === "invalid" || outcome.status === "wrongGame") {
        showToast({ message: t(`rules.transferFile.${outcome.status}`), tone: "destructive" });
        return;
      }
      showToast({
        message:
          outcome.skippedBinCount > 0
            ? `${t("rules.transferFile.imported", { name: outcome.name })} ${t("rules.transferFile.binsSkipped", { count: outcome.skippedBinCount })}`
            : t("rules.transferFile.imported", { name: outcome.name }),
        tone: "success",
      });
    },
    onError: () => showToast({ message: t("rules.transferFile.importFailed"), tone: "destructive" }),
  });

  return {
    canExport: !!activeSet,
    isImporting: importFile.isPending,
    copy: () => copy.mutate(),
    share: () => share.mutate(),
    importFile: () => importFile.mutate(),
  };
}
