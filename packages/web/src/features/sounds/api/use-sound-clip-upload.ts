import { computeWaveform } from "@/features/sounds/lib/waveform";
import type { SoundClipUploadOptions } from "@/lib/interfaces/sounds";
import { toast } from "@/lib/toast";
import {
  SOUND_CLIP_EXTENSIONS,
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function clipNameFromFile(file: File): string {
  return file.name
    .replace(/\.[^.]+$/, "")
    .slice(0, SOUND_CLIP_NAME_MAX_LENGTH)
    .trim();
}

export function useSoundClipUpload({
  uploadClip,
  clipsQueryKey,
}: SoundClipUploadOptions) {
  const { t } = useTranslation("sounds");
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: async (file: File) =>
      uploadClip(
        file,
        clipNameFromFile(file) || t("library.untitled"),
        await computeWaveform(file),
      ),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t("library.uploadFailed"));
        return;
      }
      void queryClient.invalidateQueries({ queryKey: clipsQueryKey });
      toast.success(t("library.uploaded"));
    },
    onError: () => toast.error(t("library.uploadFailed")),
  });

  const uploadFile = (file: File | undefined) => {
    if (!file) return;
    if (!SOUND_CLIP_EXTENSIONS[file.type]) {
      toast.error(t("library.wrongType"));
      return;
    }
    if (file.size > SOUND_CLIP_MAX_BYTES) {
      toast.error(t("library.tooLarge"));
      return;
    }
    upload.mutate(file);
  };

  return { uploadFile, isUploading: upload.isPending };
}
