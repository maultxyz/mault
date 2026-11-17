import type {
  PresetWorkflow,
  PresetWorkflowStageInput,
  PresetWorkflowsAndPresets,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";

export const presetWorkflowsQueryKey = ["preset-workflows"] as const;

export const presetWorkflowsQueryOptions = queryOptions({
  queryKey: presetWorkflowsQueryKey,
  queryFn: () =>
    apiGet<Result<PresetWorkflow[]>>("/api/preset-workflows").then(
      (result) => result.data ?? [],
    ),
  staleTime: Infinity,
});

export function createPresetWorkflow(
  name: string,
  firstPresetGuid: string,
  gameGuid: string | undefined,
): Promise<Result<PresetWorkflow[]> & { createdGuid?: string }> {
  return apiPost("/api/preset-workflows", { name, firstPresetGuid, gameGuid });
}

export function updatePresetWorkflow(
  guid: string,
  changes: { name: string },
): Promise<Result<PresetWorkflow[]>> {
  return apiPut(`/api/preset-workflows/${guid}`, changes);
}

export function deletePresetWorkflow(
  guid: string,
): Promise<Result<PresetWorkflow[]>> {
  return apiDelete(`/api/preset-workflows/${guid}`);
}

export function savePresetWorkflowStages(
  guid: string,
  stages: PresetWorkflowStageInput[],
): Promise<Result<PresetWorkflow[]>> {
  return apiPut(`/api/preset-workflows/${guid}/steps`, { stages });
}

export function enterPresetWorkflowStep(
  guid: string,
  stepGuid: string,
  markBinsEmptied: boolean,
): Promise<Result<PresetWorkflowsAndPresets>> {
  return apiPut(`/api/preset-workflows/${guid}/steps/${stepGuid}/enter`, {
    markBinsEmptied,
  });
}
