import {
  importCollectionCsv,
  previewCollectionCsvImport,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { toast } from "@/lib/toast";
import type { CollectionCsvImportRow } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useCollectionCsvImport(collectionGuid: string) {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();

  const preview = useMutation({
    mutationFn: async (rows: CollectionCsvImportRow[]) => {
      const result = await previewCollectionCsvImport(collectionGuid, { rows });
      if (!result.success || !result.data) {
        throw new Error(result.message ?? t("importCsv.previewFailed"));
      }
      return result.data;
    },
  });

  const importRows = useMutation({
    mutationFn: async (rows: CollectionCsvImportRow[]) => {
      const result = await importCollectionCsv(collectionGuid, { rows });
      if (!result.success || !result.data) {
        throw new Error(result.message ?? t("importCsv.failed"));
      }
      return result.data;
    },
    onSuccess: (result) => {
      toast.success(t("importCsv.imported", { count: result.importedCopies }));
      void invalidateCollectionCards(queryClient, collectionGuid);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("importCsv.failed")),
  });

  return { preview, importRows };
}
