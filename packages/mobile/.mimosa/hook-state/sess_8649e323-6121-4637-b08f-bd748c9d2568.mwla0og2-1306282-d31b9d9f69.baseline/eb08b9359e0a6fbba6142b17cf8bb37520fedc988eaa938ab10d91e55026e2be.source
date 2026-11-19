import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import type { AudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import {
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
  type SoundClip,
} from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import {
  deleteSystemSoundClip,
  systemSoundClipsQueryOptions,
  uploadSystemSoundClip,
} from "@/features/admin/api/sounds-system-clips";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { createClipPlayer, isPlayerActive, playSoundExclusively, stopSound } from "@/features/sounds/lib/sound-playback";
import { SOUND_CLIP_MIME_TYPES } from "@/lib/constants/sounds";
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
  const [clipActions, setClipActions] = useState<SoundClip | null>(null);
  const [playingClipGuid, setPlayingClipGuid] = useState<string | null>(null);
  const previewRef = useRef<{ guid: string; player: AudioPlayer } | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current && isPlayerActive(previewRef.current.player)) stopSound();
      previewRef.current?.player.remove();
      previewRef.current = null;
    },
    [],
  );

  const refreshClips = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: systemSoundClipsQueryOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: ["sound-clips"] }),
    ]);
  const showFailure = (text: string) => setMessage({ tone: "destructive", text });

  const upload = useMutation({
    mutationFn: uploadSystemSoundClip,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.sounds.library.uploaded") }),
    onError: (err: Error) => showFailure(err.message || t("settings.sounds.library.uploadFailed")),
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

  const confirmDelete = (clip: SoundClip) =>
    Alert.alert(t("settings.sounds.library.delete", { name: clip.name }), t("admin.sounds.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.sounds.delete"), style: "destructive", onPress: () => removeClip.mutate(clip.guid) },
    ]);

  const runClipAction = (action: string) => {
    const clip = clipActions;
    setClipActions(null);
    if (!clip) return;
    if (action === "preview") {
      togglePreview(clip);
    } else if (action === "rename") {
      router.push({ pathname: "/settings/sound-clip-name", params: { guid: clip.guid, name: clip.name, scope: "system" } });
    } else if (action === "delete") {
      confirmDelete(clip);
    }
  };

  return (
    <Screen
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
      <SettingsSection title={t("admin.sounds.heading")} description={t("admin.sounds.description")}>
        {clips.isPending ? (
          <ListSkeleton />
        ) : clips.isError ? (
          <Callout
            tone="destructive"
            title={t("admin.sounds.loadFailed")}
            action={<Button size="sm" variant="secondary" label={t("admin.sounds.retry")} onPress={refreshClips} />}
          />
        ) : (
          <>
            {clips.data.length === 0 ? <EmptyState icon="music" title={t("admin.sounds.empty")} /> : null}
            <ListGroup>
              {clips.data.map((clip) => {
                const isPlaying = playingClipGuid === clip.guid;
                return (
                  <ListRow
                    key={clip.guid}
                    icon={isPlaying ? "stop" : "play"}
                    title={clip.name}
                    subtitle={t("settings.sounds.library.size", { kb: Math.max(1, Math.ceil(clip.sizeBytes / 1024)) })}
                    disabled={removeClip.isPending}
                    onPress={() => setClipActions(clip)}
                    onLongPress={() => setClipActions(clip)}
                    longPressLabel={
                      isPlaying
                        ? t("settings.sounds.library.stop", { name: clip.name })
                        : t("settings.sounds.library.play", { name: clip.name })
                    }
                  />
                );
              })}
              <ListRow
                icon="upload"
                title={upload.isPending ? t("settings.sounds.library.uploading") : t("settings.sounds.library.upload")}
                subtitle={t("admin.sounds.uploadHint")}
                subtitleNumberOfLines={3}
                disabled={upload.isPending}
                onPress={() => void pickClip()}
              />
            </ListGroup>
          </>
        )}
      </SettingsSection>
      <OptionSheet
        visible={!!clipActions}
        title={clipActions?.name ?? ""}
        options={[
          ...(clipActions?.url
            ? [
                {
                  value: "preview",
                  label:
                    playingClipGuid === clipActions.guid
                      ? t("settings.sounds.library.stop", { name: clipActions.name })
                      : t("settings.sounds.library.play", { name: clipActions.name }),
                },
              ]
            : []),
          { value: "rename", label: t("settings.sounds.library.rename", { name: clipActions?.name ?? "" }) },
          { value: "delete", label: t("settings.sounds.library.delete", { name: clipActions?.name ?? "" }) },
        ]}
        selected={[]}
        onSelect={runClipAction}
        onClose={() => setClipActions(null)}
      />
    </Screen>
  );
}
