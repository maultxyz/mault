import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { soundClipNameFormSchema, type SoundClipNameFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { renameSoundClip } from "@/features/sounds/api/sounds";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SoundClipNameScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const { guid, name } = useLocalSearchParams<{ guid: string; name?: string }>();
  const form = useForm<SoundClipNameFormValues>({
    resolver: zodResolver(soundClipNameFormSchema),
    defaultValues: { name: name ?? "" },
  });
  const rename = useMutation({
    mutationFn: (values: SoundClipNameFormValues) => renameSoundClip(guid, values.name.trim()),
    onSuccess: () => {
      AccessibilityInfo.announceForAccessibility(t("settings.sounds.library.renamed"));
      router.back();
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["sound-clips", orgId] }),
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.sounds.library.rename", { name: name ?? "" })} subtitle={org?.name} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("settings.sounds.library.saveName")}
            loading={rename.isPending}
            onPress={form.handleSubmit((values) => rename.mutate(values))}
          />
        }
      >
        {rename.isError ? <Callout tone="destructive" title={t("settings.sounds.library.renameFailed")} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.sounds.library.nameLabel")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
