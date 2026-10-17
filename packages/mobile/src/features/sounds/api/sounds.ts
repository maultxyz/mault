import { queryOptions } from "@tanstack/react-query";
import type { Result, SoundClip, SoundRule, SoundRuleInput } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut, unwrap } from "@/lib/api/client";
import { SOUND_CLIP_URL_STALE_MS } from "@/lib/constants/sounds";
import type { SoundClipUpload } from "@/lib/interfaces/sounds";

export const soundClipsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["sound-clips", orgId] as const,
    queryFn: () => apiGet<Result<SoundClip[]>>("/api/sounds/clips").then((r) => r.data ?? []),
    enabled: !!orgId,
    staleTime: SOUND_CLIP_URL_STALE_MS,
    refetchInterval: SOUND_CLIP_URL_STALE_MS,
  });

export const soundRulesQueryOptions = (orgId: string | null, gameGuid: string | undefined) =>
  queryOptions({
    queryKey: ["sound-rules", orgId, gameGuid] as const,
    queryFn: () =>
      apiGet<Result<SoundRule[]>>(`/api/sounds/rules?gameGuid=${encodeURIComponent(gameGuid ?? "")}`).then(
        (r) => r.data ?? [],
      ),
    enabled: !!orgId && !!gameGuid,
    staleTime: Infinity,
  });

export const soundRuleCountQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["sound-rules", orgId, "count"] as const,
    queryFn: () => apiGet<Result<number>>("/api/sounds/rules/count").then((r) => r.data ?? 0),
    enabled: !!orgId,
  });

export function uploadSoundClip(upload: SoundClipUpload): Promise<SoundClip> {
  const form = new FormData();
  form.append("file", { uri: upload.uri, name: upload.fileName, type: upload.mimeType } as unknown as Blob);
  form.append("name", upload.name);
  return unwrap(apiPostForm<Result<SoundClip>>("/api/sounds/clips", form));
}

export function renameSoundClip(guid: string, name: string): Promise<SoundClip> {
  return unwrap(apiPut<Result<SoundClip>>(`/api/sounds/clips/${guid}`, { name }));
}

export async function deleteSoundClip(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/sounds/clips/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}

export function addSoundRule(gameGuid: string, input: SoundRuleInput): Promise<SoundRule[]> {
  return unwrap(apiPost<Result<SoundRule[]>>("/api/sounds/rules", { ...input, gameGuid }));
}

export function updateSoundRule(guid: string, input: SoundRuleInput): Promise<SoundRule[]> {
  return unwrap(apiPut<Result<SoundRule[]>>(`/api/sounds/rules/${guid}`, input));
}

export function deleteSoundRule(guid: string): Promise<SoundRule[]> {
  return unwrap(apiDelete<Result<SoundRule[]>>(`/api/sounds/rules/${guid}`));
}

export function reorderSoundRules(gameGuid: string, guids: string[]): Promise<SoundRule[]> {
  return unwrap(apiPut<Result<SoundRule[]>>("/api/sounds/rules/order", { gameGuid, guids }));
}
