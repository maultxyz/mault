import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import type { AudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import {
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
  type SoundClip,
  soundClipNameFormSchema,
  type SoundClipNameFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import {
  deleteSystemSoundClip,
  renameSystemSoundClip,
  systemSoundClipsQueryOptions,
  uploadSystemSoundClip,
} from "@/features/admin/api/sounds-system-clips";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { createClipPlayer, isPlayerActive, playSoundExclusively, stopSound } from "@/features/sounds/lib/sound-playback";
import { SOUND_CLIP_MIME_TYPES } from "@/lib/constants/sounds";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { StatusTone } from "@/lib/interfaces/theme";

export default function AdminSoundsScreen() {
  return (
    <AdminGate>
      <AdminSoundsContent />
    </AdminGate>
  );
}

function AdminSoundsContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const clips = useQuery(systemSoundClipsQueryOptions);
  const [message, setMessage] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [clipBeingRenamed, setClipBeingRenamed] = useState<SoundClip | null>(null);
  const [playingClipGuid, setPlayingClipGuid] = useState<string | null>(null);
  const previewRef = useRef<{ guid: string; player: AudioPlayer } | null>(null);
  const renameForm = useForm<SoundClipNameFormValues>({
    resolver: zodResolver(soundClipNameFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(
    () => () => {
      if (previewRef.current && isPlayerActive(previewRef.current.player)) stopSound();
      previewRef.current?.player.remove();
      previewRef.current = null;
    },
    [],
  );

  const refreshClips = () => {
    void queryClient.invalidateQueries({ queryKey: systemSoundClipsQueryOptions.queryKey });
    void queryClient.invalidateQueries({ queryKey: ["sound-clips"] });
  };
  const showFailure = (text: string) => setMessage({ tone: "destructive", text });

  const upload = useMutation({
    mutationFn: uploadSystemSoundClip,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.sounds.library.uploaded") }),
    onError: (err: Error) => showFailure(err.message || t("settings.sounds.library.uploadFailed")),
    onSettled: refreshClips,
  });
  const rename = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) => renameSystemSoundClip(guid, name),
    onSuccess: () => {
      setClipBeingRenamed(null);
      setMessage({ tone: "success", text: t("settings.sounds.library.renamed") });
    },
    onError: (err: Error) => showFailure(err.message || t("settings.sounds.library.renameFailed")),
    onSettled: refreshClips,
  });
  const removeClip = useMutation({
    mutationFn: deleteSystemSoundClip,
    onSuccess: () => setMessage({ tone: "success", text: t("admin.sounds.deleted") }),
    onError: (err: Error) => showFailure(err.message || t("settings.sounds.library.deleteFailed")),
    onSettled: () => {
      refreshClips();
      void queryClient.invalidateQueries({ queryKey: ["sound-rules"] });
    },
  });

  const pickClip = async () => {
    setMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: SOUND_CLIP_MIME_TYPES, copyToCacheDirectory: true });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      const mimeType = asset.mimeType ?? "";
      if (!SOUND_CLIP_MIME_TYPES.includes(mimeType)) {
        showFailure(t("settings.sounds.library.wrongType"));
        return;
      }
      if (asset.size != null && asset.size > SOUND_CLIP_MAX_BYTES) {
        showFailure(t("settings.sounds.library.tooLarge"));
        return;
      }
      const name =
        asset.name.replace(/\.[^.]+$/, "").slice(0, SOUND_CLIP_NAME_MAX_LENGTH).trim() ||
        t("settings.sounds.library.untitled");
      upload.mutate({ uri: asset.uri, fileName: asset.name, mimeType, name });
    } catch {
      showFailure(t("settings.sounds.library.pickFailed"));
    }
  };

  const togglePreview = (clip: SoundClip) => {
    const preview = previewRef.current;
    if (preview && preview.guid === clip.guid && isPlayerActive(preview.player)) {
      stopSound();
      setPlayingClipGuid(null);
      return;
    }
    stopSound();
    if (!clip.url) return;
    preview?.player.remove();
    const player = createClipPlayer(clip.url);
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) setPlayingClipGuid((current) => (current === clip.guid ? null : current));
    });
    previewRef.current = { guid: clip.guid, player };
    setPlayingClipGuid(clip.guid);
    playSoundExclusively(player);
  };

  const startRename = (clip: SoundClip) => {
    renameForm.reset({ name: clip.name });
    setClipBeingRenamed(clip);
  };

  const confirmDelete = (clip: SoundClip) =>
    Alert.alert(t("settings.sounds.library.delete", { name: clip.name }), t("admin.sounds.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.sounds.delete"), style: "destructive", onPress: () => removeClip.mutate(clip.guid) },
    ]);

  return (
    <Screen
      refreshing={clips.isRefetching}
      onRefresh={refreshClips}
      header={
        <PageHeader
          title={t("admin.sections.sounds.title")}
          subtitle={t("admin.sections.sounds.subtitle")}
          onBack={() => router.back()}
        />
      }
    >
      {message ? <Callout tone={message.tone} title={message.text} /> : null}
      <SectionHeader title={t("admin.sounds.heading")} />
      <AppText size="xs" tone="secondary">
        {t("admin.sounds.description")}
      </AppText>
      {clipBeingRenamed ? (
        <Surface style={{ gap: SPACING.md }}>
          <Controller
            control={renameForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label={t("settings.sounds.library.nameLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button
              style={{ flex: 1 }}
              variant="ghost"
              label={t("settings.sounds.library.cancelRename")}
              onPress={() => setClipBeingRenamed(null)}
            />
            <Button
              style={{ flex: 1 }}
              label={t("settings.sounds.library.saveName")}
              loading={rename.isPending}
              onPress={renameForm.handleSubmit((draft) => {
                const name = draft.name.trim();
                if (name === clipBeingRenamed.name) {
                  setClipBeingRenamed(null);
                  return;
                }
                rename.mutate({ guid: clipBeingRenamed.guid, name });
              })}
            />
          </View>
        </Surface>
      ) : null}
      {clips.isPending ? (
        <ListSkeleton />
      ) : clips.isError ? (
        <Callout
          tone="destructive"
          title={t("admin.sounds.loadFailed")}
          action={<Button variant="secondary" icon="refresh" label={t("admin.sounds.retry")} onPress={refreshClips} />}
        />
      ) : clips.data.length === 0 ? (
        <EmptyState icon="music" title={t("admin.sounds.empty")} />
      ) : (
        <ListGroup>
          {clips.data.map((clip) => (
            <ListRow
              key={clip.guid}
              title={clip.name}
              subtitle={t("settings.sounds.library.size", { kb: Math.max(1, Math.ceil(clip.sizeBytes / 1024)) })}
              rightIsInteractive
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                  <IconButton
                    icon="edit"
                    size={32}
                    variant="plain"
                    accessibilityLabel={t("settings.sounds.library.rename", { name: clip.name })}
                    disabled={rename.isPending}
                    onPress={() => startRename(clip)}
                  />
                  <IconButton
                    icon="trash"
                    size={32}
                    variant="plain"
                    accessibilityLabel={t("settings.sounds.library.delete", { name: clip.name })}
                    disabled={removeClip.isPending}
                    onPress={() => confirmDelete(clip)}
                  />
                </View>
              }
              leading={
                <IconButton
                  icon={playingClipGuid === clip.guid ? "stop" : "play"}
                  size={36}
                  accessibilityLabel={
                    playingClipGuid === clip.guid
                      ? t("settings.sounds.library.stop", { name: clip.name })
                      : t("settings.sounds.library.play", { name: clip.name })
                  }
                  disabled={!clip.url}
                  onPress={() => togglePreview(clip)}
                />
              }
            />
          ))}
        </ListGroup>
      )}
      <Button
        variant="secondary"
        icon="upload"
        label={upload.isPending ? t("settings.sounds.library.uploading") : t("settings.sounds.library.upload")}
        loading={upload.isPending}
        onPress={() => void pickClip()}
      />
      <AppText size="xs" tone="secondary">
        {t("admin.sounds.uploadHint")}
      </AppText>
    </Screen>
  );
}
