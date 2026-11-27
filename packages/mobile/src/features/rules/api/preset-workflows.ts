import { queryOptions } from "@tanstack/react-query";
import type {
  PresetWorkflow,
  PresetWorkflowStageInput,
  PresetWorkflowsAndPresets,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap } from "@/lib/api/client";
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

export function createPresetWorkflow(
  name: string,
  firstPresetGuid: string,
  gameGuid: string | undefined,
): Promise<PresetWorkflow[]> {
  return unwrap(apiPost<Result<PresetWorkflow[]>>("/api/preset-workflows", { name, firstPresetGuid, gameGuid }));
}

export function renamePresetWorkflow(guid: string, name: string): Promise<PresetWorkflow[]> {
  return unwrap(apiPut<Result<PresetWorkflow[]>>(`/api/preset-workflows/${guid}`, { name }));
}

export function deletePresetWorkflow(guid: string): Promise<PresetWorkflow[]> {
  return unwrap(apiDelete<Result<PresetWorkflow[]>>(`/api/preset-workflows/${guid}`));
}

export function savePresetWorkflowStages(guid: string, stages: PresetWorkflowStageInput[]): Promise<PresetWorkflow[]> {
  return unwrap(apiPut<Result<PresetWorkflow[]>>(`/api/preset-workflows/${guid}/steps`, { stages }));
}
