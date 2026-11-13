import { apiGet, apiPost } from "@/lib/api/client";
import type { ImportTemplateRow } from "@/lib/interfaces/csv-import";
import type { Result } from "@magic-vault/shared";

export function importTemplatesQueryOptions(type: string, orgId: string) {
  return {
    queryKey: ["import-templates", orgId, type],
    queryFn: async () => {
      const result = await apiGet<Result<ImportTemplateRow[]>>(
        `/api/import-templates?type=${encodeURIComponent(type)}`,
      );
      return result.success ? result.data : [];
    },
  };
}

export function createImportTemplate(input: {
  name: string;
  type: string;
  mapping: ImportTemplateRow["mapping"];
}) {
  return apiPost<Result<{ guid: string }>>("/api/import-templates", input);
}
