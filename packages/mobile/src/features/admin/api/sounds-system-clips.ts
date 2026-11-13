import { queryOptions } from "@tanstack/react-query";
import type { Result, SoundClip } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPostForm, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import { ADMIN_SYSTEM_SOUND_CLIPS_QUERY_KEY } from "@/lib/constants/admin-sounds";
import { SOUND_CLIP_URL_STALE_MS } from "@/lib/constants/sounds";
import type { SoundClipUpload } from "@/lib/interfaces/sounds";

export const systemSoundClipsQueryOptions = queryOptions({
  queryKey: ADMIN_SYSTEM_SOUND_CLIPS_QUERY_KEY,
  queryFn: () => unwrapOr(apiGet<Result<SoundClip[]>>("/api/admin/sound-clips"), []),
  staleTime: SOUND_CLIP_URL_STALE_MS,
  refetchInterval: SOUND_CLIP_URL_STALE_MS,
});

export function uploadSystemSoundClip(upload: SoundClipUpload): Promise<SoundClip> {
  const form = new FormData();
  form.append("file", { uri: upload.uri, name: upload.fileName, type: upload.mimeType } as unknown as Blob);
  form.append("name", upload.name);
  return unwrap(apiPostForm<Result<SoundClip>>("/api/admin/sound-clips", form));
}

export function renameSystemSoundClip(guid: string, name: string): Promise<SoundClip> {
  return unwrap(apiPut<Result<SoundClip>>(`/api/admin/sound-clips/${guid}`, { name }));
}

export async function deleteSystemSoundClip(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/admin/sound-clips/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
