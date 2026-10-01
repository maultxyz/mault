import { Button } from "@/components/ui/button";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  soundClipsQueryOptions,
  uploadSoundClip,
} from "@/features/sounds/api/sounds";
import { SoundClipRow } from "@/features/sounds/components/sound-clip-row";
import { computeWaveform } from "@/features/sounds/lib/waveform";
import { SOUND_CLIP_ACCEPT } from "@/lib/constants/sounds";
import { toast } from "@/lib/toast";
import {
  SOUND_CLIP_EXTENSIONS,
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { IconUpload } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

function clipNameFromFile(file: File): string {
  return file.name
    .replace(/\.[^.]+$/, "")
    .slice(0, SOUND_CLIP_NAME_MAX_LENGTH)
    .trim();
}

export function SoundClipLibrary() {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const clipsOpts = soundClipsQueryOptions(activeOrg?.id);
  const { data: clips = [], isLoading } = useQuery(clipsOpts);

  const upload = useMutation({
    mutationFn: async (file: File) =>
      uploadSoundClip(
        file,
        clipNameFromFile(file) || t("library.untitled"),
        await computeWaveform(file),
      ),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t("library.uploadFailed"));
        return;
      }
      void queryClient.invalidateQueries({ queryKey: clipsOpts.queryKey });
      toast.success(t("library.uploaded"));
    },
    onError: () => toast.error(t("library.uploadFailed")),
  });

  const handleFile = (file: File | undefined) => {
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

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold">
            {t("library.heading")}
          </h2>
          <p className="mt-0.5 text-sm text-foreground/70">
            {t("library.description")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          <IconUpload />
          {upload.isPending ? t("library.uploading") : t("library.upload")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={SOUND_CLIP_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {!isLoading && clips.length === 0 ? (
        <p className="text-sm text-foreground/70">{t("library.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {clips.map((clip) => (
            <SoundClipRow key={clip.guid} clip={clip} />
          ))}
        </ul>
      )}
    </section>
  );
}
