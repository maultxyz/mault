import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
} from "@/lib/api/client";
import { SOUND_CLIP_URL_STALE_MS } from "@/lib/constants/sounds";
import type {
  Result,
  SoundClip,
  SoundRule,
  SoundRuleInput,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const soundClipsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["sound-clips", orgId] as const,
    queryFn: () =>
      apiGet<Result<SoundClip[]>>("/api/sounds/clips").then(
        (r) => r.data ?? [],
      ),
    enabled: !!orgId,
    staleTime: SOUND_CLIP_URL_STALE_MS,
    refetchInterval: SOUND_CLIP_URL_STALE_MS,
  });

export const soundRulesQueryOptions = (
  orgId: string | undefined,
  gameGuid: string | undefined,
) =>
  queryOptions({
    queryKey: ["sound-rules", orgId, gameGuid] as const,
    queryFn: () =>
      apiGet<Result<SoundRule[]>>(
        `/api/sounds/rules?gameGuid=${encodeURIComponent(gameGuid!)}`,
      ).then((r) => r.data ?? []),
    enabled: !!orgId && !!gameGuid,
    staleTime: Infinity,
  });

export const soundRuleCountQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["sound-rules", orgId, "count"] as const,
    queryFn: () =>
      apiGet<Result<number>>("/api/sounds/rules/count").then(
        (r) => r.data ?? 0,
      ),
    enabled: !!orgId,
  });

export function uploadSoundClip(
  file: File,
  name: string,
  waveform: number[] | null,
): Promise<Result<SoundClip>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  if (waveform) formData.append("waveform", JSON.stringify(waveform));
  return apiPostForm<Result<SoundClip>>("/api/sounds/clips", formData);
}

export function renameSoundClip(
  guid: string,
  name: string,
): Promise<Result<SoundClip>> {
  return apiPut<Result<SoundClip>>(`/api/sounds/clips/${guid}`, { name });
}

export function deleteSoundClip(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/sounds/clips/${guid}`);
}

export function addSoundRule(
  gameGuid: string,
  input: SoundRuleInput,
): Promise<Result<SoundRule[]>> {
  return apiPost<Result<SoundRule[]>>("/api/sounds/rules", {
    ...input,
    gameGuid,
  });
}

export function updateSoundRule(
  guid: string,
  input: SoundRuleInput,
): Promise<Result<SoundRule[]>> {
  return apiPut<Result<SoundRule[]>>(`/api/sounds/rules/${guid}`, input);
}

export function deleteSoundRule(guid: string): Promise<Result<SoundRule[]>> {
  return apiDelete<Result<SoundRule[]>>(`/api/sounds/rules/${guid}`);
}

export function reorderSoundRules(
  gameGuid: string,
  guids: string[],
): Promise<Result<SoundRule[]>> {
  return apiPut<Result<SoundRule[]>>("/api/sounds/rules/order", {
    gameGuid,
    guids,
  });
}
