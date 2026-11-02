import { EmptyState } from "@/components/empty-state";
import { PlanNotice } from "@/components/plan-notice";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/features/billing/api/use-billing";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  deleteSoundClip,
  renameSoundClip,
  soundClipsQueryOptions,
  uploadSoundClip,
} from "@/features/sounds/api/sounds";
import { useSoundClipUpload } from "@/features/sounds/api/use-sound-clip-upload";
import { SoundClipRow } from "@/features/sounds/components/sound-clip-row";
import { SOUND_CLIP_ACCEPT } from "@/lib/constants/sounds";
import { IconMusic, IconUpload } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function SoundClipLibrary() {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const inputRef = useRef<HTMLInputElement>(null);
  const clipsOpts = soundClipsQueryOptions(activeOrg?.id);
  const { data: clips = [], isLoading } = useQuery(clipsOpts);
  const { billing } = useBilling();
  const isUploadLocked = billing?.customSounds === false;

  const { uploadFile, isUploading } = useSoundClipUpload({
    uploadClip: uploadSoundClip,
    clipsQueryKey: clipsOpts.queryKey,
  });

  return (
    <SettingsSection
      heading={t("library.heading")}
      description={t("library.description")}
      action={
        <>
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || isUploadLocked}
          >
            <IconUpload />
            {isUploading ? t("library.uploading") : t("library.upload")}
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
      {isUploadLocked && <PlanNotice message={t("library.notInPlan")} />}
      {!isLoading && clips.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconMusic}
          title={t("library.empty")}
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border empty:hidden">
          {clips.map((clip) => (
            <SoundClipRow
              key={clip.guid}
              clip={clip}
              clipsQueryKey={clipsOpts.queryKey}
              renameClip={clip.isSystem ? undefined : renameSoundClip}
              deleteClip={clip.isSystem ? undefined : deleteSoundClip}
            />
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
