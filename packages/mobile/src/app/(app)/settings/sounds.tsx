import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import type { AudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Switch, View } from "react-native";
import {
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
  type SoundClip,
  soundClipNameFormSchema,
  type SoundClipNameFormValues,
  soundRulesDraftFormSchema,
  type SoundRulesDraftFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { SettingsPage } from "@/features/settings/components/settings-page";
import {
  deleteSoundClip,
  renameSoundClip,
  reorderSoundRules,
  soundClipsQueryOptions,
  soundRuleCountQueryOptions,
  soundRulesQueryOptions,
  updateSoundRule,
  uploadSoundClip,
} from "@/features/sounds/api/sounds";
import { createClipPlayer, isPlayerActive, playSoundExclusively, stopSound } from "@/features/sounds/lib/sound-playback";
import { orderSoundRules, toSoundRulesDraft } from "@/features/sounds/lib/sound-rules-draft";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SOUND_CLIP_MIME_TYPES } from "@/lib/constants/sounds";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SoundsSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const { collection, gameGuid } = useRulesData();
  const clips = useQuery(soundClipsQueryOptions(orgId));
  const rulesQuery = useQuery(soundRulesQueryOptions(orgId, gameGuid));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const { data: totalRules = 0 } = useQuery(soundRuleCountQueryOptions(orgId));
  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const ruleLimit = billing?.maxSoundRules ?? null;
  const atRuleLimit = ruleLimit !== null && totalRules >= ruleLimit;
  const [message, setMessage] = useState<{ tone: "success" | "destructive"; text: string } | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [clipActions, setClipActions] = useState<SoundClip | null>(null);
  const [renaming, setRenaming] = useState<SoundClip | null>(null);
  const [playingGuid, setPlayingGuid] = useState<string | null>(null);
  const previewRef = useRef<{ guid: string; player: AudioPlayer } | null>(null);

  const values = useMemo(() => toSoundRulesDraft(rules), [rules]);
  const form = useForm<SoundRulesDraftFormValues>({
    resolver: zodResolver(soundRulesDraftFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const order = useWatch({ control: form.control, name: "order" });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const orderedRules = useMemo(() => orderSoundRules(rules, order ?? []), [rules, order]);
  const renameForm = useForm<SoundClipNameFormValues>({
    resolver: zodResolver(soundClipNameFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(
    () => () => {
      previewRef.current?.player.remove();
      previewRef.current = null;
    },
    [],
  );

  const refreshClips = () => void queryClient.invalidateQueries({ queryKey: ["sound-clips", orgId] });
  const fail = (text: string) => setMessage({ tone: "destructive", text });

  const upload = useMutation({
    mutationFn: uploadSoundClip,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.sounds.library.uploaded") }),
    onError: (err: Error) => fail(err.message || t("settings.sounds.library.uploadFailed")),
    onSettled: refreshClips,
  });
  const rename = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) => renameSoundClip(guid, name),
    onSuccess: () => {
      setRenaming(null);
      setMessage({ tone: "success", text: t("settings.sounds.library.renamed") });
    },
    onError: () => fail(t("settings.sounds.library.renameFailed")),
    onSettled: refreshClips,
  });
  const removeClip = useMutation({
    mutationFn: deleteSoundClip,
    onError: () => fail(t("settings.sounds.library.deleteFailed")),
    onSettled: () => {
      refreshClips();
      void queryClient.invalidateQueries({ queryKey: ["sound-rules", orgId] });
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
        fail(t("settings.sounds.library.wrongType"));
        return;
      }
      if (asset.size != null && asset.size > SOUND_CLIP_MAX_BYTES) {
        fail(t("settings.sounds.library.tooLarge"));
        return;
      }
      const name = asset.name.replace(/\.[^.]+$/, "").slice(0, SOUND_CLIP_NAME_MAX_LENGTH) || t("settings.sounds.library.untitled");
      upload.mutate({ uri: asset.uri, fileName: asset.name, mimeType, name });
    } catch {
      fail(t("settings.sounds.library.pickFailed"));
    }
  };

  const togglePreview = (clip: SoundClip) => {
    const preview = previewRef.current;
    if (preview && preview.guid === clip.guid && isPlayerActive(preview.player)) {
      stopSound();
      setPlayingGuid(null);
      return;
    }
    stopSound();
    if (!clip.url) return;
    preview?.player.remove();
    const player = createClipPlayer(clip.url);
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) setPlayingGuid((current) => (current === clip.guid ? null : current));
    });
    previewRef.current = { guid: clip.guid, player };
    setPlayingGuid(clip.guid);
    playSoundExclusively(player);
  };

  const runClipAction = (action: string) => {
    const clip = clipActions;
    setClipActions(null);
    if (!clip) return;
    if (action === "rename") {
      renameForm.reset({ name: clip.name });
      setRenaming(clip);
    } else if (action === "delete") {
      Alert.alert(t("settings.sounds.library.delete", { name: clip.name }), t("settings.sounds.library.deleteConfirm"), [
        { text: t("settings.sounds.ruleDialog.cancel"), style: "cancel" },
        { text: t("cardDetail.remove"), style: "destructive", onPress: () => removeClip.mutate(clip.guid) },
      ]);
    }
  };

  const move = (index: number, offset: number) => {
    const next = orderedRules.map((rule) => rule.guid);
    const [moved] = next.splice(index, 1);
    next.splice(index + offset, 0, moved);
    form.setValue("order", next, { shouldDirty: true });
  };

  const submit = async (draft: SoundRulesDraftFormValues) => {
    if (!gameGuid) return;
    setSaveError(false);
    try {
      let latest = null;
      for (const rule of rules) {
        const next = draft.enabled[rule.guid];
        if (next === undefined || next === rule.isEnabled) continue;
        latest = await updateSoundRule(rule.guid, {
          name: rule.name,
          rules: rule.rules,
          clipGuid: rule.clipGuid,
          isEnabled: next,
        });
      }
      const nextOrder = orderSoundRules(rules, draft.order).map((rule) => rule.guid);
      if (nextOrder.some((guid, index) => guid !== rules[index]?.guid)) {
        latest = await reorderSoundRules(gameGuid, nextOrder);
      }
      if (latest) {
        queryClient.setQueryData(soundRulesQueryOptions(orgId, gameGuid).queryKey, latest);
        form.reset(toSoundRulesDraft(latest));
      } else {
        form.reset(draft);
      }
      setMessage({ tone: "success", text: t("settings.sounds.rules.saved") });
    } catch {
      setSaveError(true);
      void queryClient.invalidateQueries({ queryKey: ["sound-rules", orgId] });
    }
  };

  const clipName = (guid: string | null) => clips.data?.find((clip) => clip.guid === guid)?.name;

  return (
    <SettingsPage
      title={t("settings.sounds.title")}
      isDirty={form.formState.isDirty}
      isSaving={form.formState.isSubmitting}
      saveError={saveError}
      onSave={() => void form.handleSubmit(submit)()}
      onDiscard={() => form.reset(values)}
    >
      <AppText size="sm" tone="secondary">
        {collection?.game ? t("settings.sounds.subtitle", { game: collection.game.name }) : t("settings.sounds.subtitleNoGame")}
      </AppText>
      {message ? <Callout tone={message.tone} title={message.text} /> : null}

      <SectionHeader title={t("settings.sounds.library.heading")} />
      <AppText size="xs" tone="secondary">
        {t("settings.sounds.library.description")}
      </AppText>
      {renaming ? (
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
            <Button style={{ flex: 1 }} variant="ghost" label={t("settings.sounds.library.cancelRename")} onPress={() => setRenaming(null)} />
            <Button
              style={{ flex: 1 }}
              label={t("settings.sounds.library.saveName")}
              loading={rename.isPending}
              onPress={renameForm.handleSubmit((draft) => rename.mutate({ guid: renaming.guid, name: draft.name.trim() }))}
            />
          </View>
        </Surface>
      ) : null}
      {clips.data && clips.data.length === 0 ? (
        <EmptyState icon="music" title={t("settings.sounds.library.empty")} />
      ) : (
        <ListGroup>
          {(clips.data ?? []).map((clip) => (
            <ListRow
              key={clip.guid}
              title={clip.name}
              subtitle={t("settings.sounds.library.size", { kb: Math.max(1, Math.round(clip.sizeBytes / 1024)) })}
              onPress={() => setClipActions(clip)}
              leading={
                <IconButton
                  icon={playingGuid === clip.guid ? "stop" : "play"}
                  size={36}
                  accessibilityLabel={
                    playingGuid === clip.guid
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

      {gameGuid ? (
        <>
          <SectionHeader title={t("settings.sounds.rules.heading")} />
          <AppText size="xs" tone="secondary">
            {t("settings.sounds.rules.description")}
          </AppText>
          {atRuleLimit && ruleLimit !== null ? (
            <Callout tone="info" title={t("settings.sounds.rules.limitReached", { count: ruleLimit })} />
          ) : null}
          {clips.data && clips.data.length === 0 ? (
            <Callout tone="info" title={t("settings.sounds.rules.needsClip")} />
          ) : null}
          {rulesQuery.data && orderedRules.length === 0 ? (
            <EmptyState icon="music" title={t("settings.sounds.rules.empty")} />
          ) : (
            <ListGroup>
              {orderedRules.map((rule, index) => {
                const clip = clipName(rule.clipGuid);
                return (
                  <ListRow
                    key={rule.guid}
                    title={rule.name}
                    subtitle={clip ? t("settings.sounds.rules.plays", { clip }) : t("settings.sounds.rules.noClip")}
                    onPress={() => router.push({ pathname: "/settings/sound-rule", params: { guid: rule.guid } })}
                    right={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                        <IconButton
                          icon="arrowUp"
                          size={32}
                          variant="plain"
                          accessibilityLabel={t("settings.sounds.rules.moveUp")}
                          disabled={index === 0}
                          onPress={() => move(index, -1)}
                        />
                        <IconButton
                          icon="arrowDown"
                          size={32}
                          variant="plain"
                          accessibilityLabel={t("settings.sounds.rules.moveDown")}
                          disabled={index === orderedRules.length - 1}
                          onPress={() => move(index, 1)}
                        />
                        <Switch
                          accessibilityLabel={t("settings.sounds.rules.enabled")}
                          value={enabled?.[rule.guid] ?? rule.isEnabled}
                          onValueChange={(value) => form.setValue(`enabled.${rule.guid}`, value, { shouldDirty: true })}
                          trackColor={{ true: colors.primary, false: colors.muted }}
                        />
                      </View>
                    }
                  />
                );
              })}
            </ListGroup>
          )}
          <Button
            variant="secondary"
            icon="plus"
            label={t("settings.sounds.rules.add")}
            disabled={atRuleLimit || !clips.data?.length}
            onPress={() => router.push("/settings/sound-rule")}
          />
        </>
      ) : null}

      <OptionSheet
        visible={!!clipActions}
        title={clipActions?.name ?? ""}
        options={[
          { value: "rename", label: t("settings.sounds.library.rename", { name: clipActions?.name ?? "" }) },
          { value: "delete", label: t("settings.sounds.library.delete", { name: clipActions?.name ?? "" }) },
        ]}
        selected={[]}
        onSelect={runClipAction}
        onClose={() => setClipActions(null)}
      />
    </SettingsPage>
  );
}
