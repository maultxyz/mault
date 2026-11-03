import { queryOptions } from "@tanstack/react-query";
import type { PresetWorkflow, PresetWorkflowsAndPresets, Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const presetWorkflowsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["preset-workflows", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<PresetWorkflow[]>>("/api/preset-workflows")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function enterPresetWorkflowStep(
  workflowGuid: string,
  stepGuid: string,
  markBinsEmptied: boolean,
): Promise<PresetWorkflowsAndPresets> {
  return unwrap(
    apiPut<Result<PresetWorkflowsAndPresets>>(`/api/preset-workflows/${workflowGuid}/steps/${stepGuid}/enter`, {
      markBinsEmptied,
    }),
  );
}
