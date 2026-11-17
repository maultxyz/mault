import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteSystemSoundClip,
  renameSystemSoundClip,
  systemSoundClipsQueryOptions,
  uploadSystemSoundClip,
} from "@/features/admin/api/system-sound-clips";
import { useSoundClipUpload } from "@/features/sounds/api/use-sound-clip-upload";
import { SoundClipRow } from "@/features/sounds/components/sound-clip-row";
import { SOUND_CLIP_ACCEPT } from "@/lib/constants/sounds";
import { IconMusic, IconUpload } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function SystemSoundClipsManager() {
  const { t } = useTranslation("admin");
  const { t: tSounds } = useTranslation("sounds");
  const inputRef = useRef<HTMLInputElement>(null);
  const clipsOpts = systemSoundClipsQueryOptions();
  const { data: clips = [], isLoading } = useQuery(clipsOpts);
  const { uploadFile, isUploading } = useSoundClipUpload({
    uploadClip: uploadSystemSoundClip,
    clipsQueryKey: clipsOpts.queryKey,
  });

  return (
    <SettingsSection
      heading={t("systemSoundClips.heading")}
      description={t("systemSoundClips.description")}
      action={
        <>
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <IconUpload />
            {isUploading
              ? tSounds("library.uploading")
              : tSounds("library.upload")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={SOUND_CLIP_ACCEPT}
            className="hidden"
            onChange={(e) => {
              uploadFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : clips.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconMusic}
          title={t("systemSoundClips.empty")}
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {clips.map((clip) => (
            <SoundClipRow
              key={clip.guid}
              clip={clip}
              clipsQueryKey={clipsOpts.queryKey}
              renameClip={renameSystemSoundClip}
              deleteClip={deleteSystemSoundClip}
            />
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
