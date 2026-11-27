import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { piHostNameFormSchema, type PiHostNameFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { useRaspberryPis } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function RenameRaspberryPiScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { guid = "" } = useLocalSearchParams<{ guid?: string }>();
  const { query, rename } = useRaspberryPis();
  const host = query.data?.hosts.find((candidate) => candidate.guid === guid);
  const form = useForm<PiHostNameFormValues>({
    resolver: zodResolver(piHostNameFormSchema),
    values: { name: host?.name ?? "" },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.raspberryPis.renameTitle")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("settings.raspberryPis.renameSave")}
            loading={rename.isPending}
            onPress={form.handleSubmit((values) =>
              rename.mutate({ guid, name: values.name }, { onSuccess: () => router.back() }),
            )}
          />
        }
      >
        {rename.isError ? <Callout tone="destructive" title={rename.error.message} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.raspberryPis.nameLabel")}
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
