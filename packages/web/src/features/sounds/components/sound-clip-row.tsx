import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  deleteSoundClip,
  renameSoundClip,
  soundClipsQueryOptions,
} from "@/features/sounds/api/sounds";
import { SoundWaveform } from "@/features/sounds/components/sound-waveform";
import type {
  ClipPreviewState,
  SoundClipRowProps,
} from "@/lib/interfaces/sounds";
import { toast } from "@/lib/toast";
import {
  createSoundClipNameSchema,
  type SoundClipNameFormValues,
} from "@/schemas/sound-clip.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SoundClip } from "@magic-vault/shared";
import {
  IconCheck,
  IconPencil,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function SoundClipRow({ clip }: SoundClipRowProps) {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const clipsKey = soundClipsQueryOptions(activeOrg?.id).queryKey;
  const [editing, setEditing] = useState(false);
  const [preview] = useState<ClipPreviewState>(() => ({
    audio: null,
    frame: 0,
  }));
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const schema = useMemo(() => createSoundClipNameSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<SoundClipNameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: clip.name },
  });

  const rename = useMutation({
    mutationFn: (name: string) => renameSoundClip(clip.guid, name),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("library.renameFailed"));
        return;
      }
      const saved = result.data;
      queryClient.setQueryData(clipsKey, (old: SoundClip[] | undefined) =>
        old?.map((c) => (c.guid === saved.guid ? saved : c)),
      );
      setEditing(false);
    },
    onError: () => toast.error(t("library.renameFailed")),
  });

  const remove = useMutation({
    mutationFn: () => deleteSoundClip(clip.guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clipsKey });
      void queryClient.invalidateQueries({ queryKey: ["sound-rules"] });
    },
    onError: () => toast.error(t("library.deleteFailed")),
  });

  const stopPreview = useCallback(() => {
    preview.audio?.pause();
    preview.audio = null;
    cancelAnimationFrame(preview.frame);
    setIsPreviewing(false);
    setProgress(0);
  }, [preview]);

  const startPreview = () => {
    if (!clip.url) return;
    const audio = new Audio(clip.url);
    preview.audio = audio;
    const tick = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
      preview.frame = requestAnimationFrame(tick);
    };
    audio.addEventListener("ended", stopPreview);
    audio
      .play()
      .then(() => {
        setIsPreviewing(true);
        tick();
      })
      .catch(stopPreview);
  };

  useEffect(() => stopPreview, [stopPreview]);

  const startEditing = () => {
    reset({ name: clip.name });
    setEditing(true);
    requestAnimationFrame(() => setFocus("name"));
  };

  const onSubmit = ({ name }: SoundClipNameFormValues) => {
    if (name === clip.name) {
      setEditing(false);
      return;
    }
    rename.mutate(name);
  };

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 px-3 py-2">
      <div className="col-start-2 row-start-1 min-w-0">
        {editing ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex min-w-0 items-start gap-2"
          >
            <Field data-invalid={!!errors.name} className="min-w-0 flex-1">
              <Input
                aria-label={t("library.nameLabel")}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <ButtonGroup>
              <Button
                type="submit"
                size="icon"
                variant="outline"
                disabled={rename.isPending}
                aria-label={t("library.saveName")}
                title={t("library.saveName")}
              >
                <IconCheck size={14} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={t("library.cancelRename")}
                title={t("library.cancelRename")}
                onClick={() => setEditing(false)}
              >
                <IconX size={14} />
              </Button>
            </ButtonGroup>
          </form>
        ) : (
          <span className="block truncate text-sm">{clip.name}</span>
        )}
      </div>

      <Button
        size="icon-lg"
        variant={isPreviewing ? "default" : "secondary"}
        className="col-start-1 row-start-2 size-10 rounded-full"
        disabled={!clip.url}
        aria-label={
          isPreviewing
            ? t("library.stop", { name: clip.name })
            : t("library.play", { name: clip.name })
        }
        title={
          isPreviewing
            ? t("library.stop", { name: clip.name })
            : t("library.play", { name: clip.name })
        }
        onClick={isPreviewing ? stopPreview : startPreview}
      >
        {isPreviewing ? (
          <IconPlayerStop className="size-5" />
        ) : (
          <IconPlayerPlay className="size-5" />
        )}
      </Button>

      <SoundWaveform
        peaks={clip.waveform}
        progress={progress}
        className="col-start-2 row-start-2"
      />

      <span className="col-start-3 row-start-2 text-sm tabular-nums text-foreground/70">
        {t("library.size", { kb: Math.ceil(clip.sizeBytes / 1024) })}
      </span>
      <ButtonGroup className="col-start-4 row-start-2">
        <Button
          size="icon"
          variant="outline"
          disabled={editing}
          aria-label={t("library.rename", { name: clip.name })}
          title={t("library.rename", { name: clip.name })}
          onClick={startEditing}
        >
          <IconPencil size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline-destructive"
          disabled={remove.isPending}
          aria-label={t("library.delete", { name: clip.name })}
          title={t("library.delete", { name: clip.name })}
          onClick={() => remove.mutate()}
        >
          <IconTrash size={14} />
        </Button>
      </ButtonGroup>
    </li>
  );
}
