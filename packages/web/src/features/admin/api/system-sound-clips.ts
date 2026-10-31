import { apiDelete, apiGet, apiPostForm, apiPut } from "@/lib/api/client";
import { SOUND_CLIP_URL_STALE_MS } from "@/lib/constants/sounds";
import type { Result, SoundClip } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const systemSoundClipsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "system-sound-clips"] as const,
    queryFn: () =>
      apiGet<Result<SoundClip[]>>("/api/admin/sound-clips").then(
        (r) => r.data ?? [],
      ),
    staleTime: SOUND_CLIP_URL_STALE_MS,
    refetchInterval: SOUND_CLIP_URL_STALE_MS,
  });

export function uploadSystemSoundClip(
  file: File,
  name: string,
  waveform: number[] | null,
): Promise<Result<SoundClip>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  if (waveform) formData.append("waveform", JSON.stringify(waveform));
  return apiPostForm<Result<SoundClip>>("/api/admin/sound-clips", formData);
}

export function renameSystemSoundClip(
  guid: string,
  name: string,
): Promise<Result<SoundClip>> {
  return apiPut<Result<SoundClip>>(`/api/admin/sound-clips/${guid}`, { name });
}

export function deleteSystemSoundClip(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/admin/sound-clips/${guid}`);
}
