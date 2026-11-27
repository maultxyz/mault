import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { deviceNameFormSchema, type DeviceNameFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { saveDevice } from "@/features/calibration/api/calibration-configs";
import { devicesQueryOptions } from "@/features/devices/api/devices";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SorterNameScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const { guid = "" } = useLocalSearchParams<{ guid?: string }>();
  const devices = useQuery(devicesQueryOptions(orgId));
  const device = devices.data?.find((candidate) => candidate.guid === guid);
  const form = useForm<DeviceNameFormValues>({
    resolver: zodResolver(deviceNameFormSchema),
    values: { name: device?.name ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const rename = useMutation({
    mutationFn: (values: DeviceNameFormValues) => saveDevice(guid, { name: values.name.trim() }),
    onSuccess: (saved) => {
      sorter.updateDevice(saved);
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      router.back();
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("sorter.rename.title")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("sorter.rename.save")}
            loading={rename.isPending}
            disabled={!device}
            onPress={form.handleSubmit((values) => rename.mutate(values))}
          />
        }
      >
        {rename.isError ? <Callout tone="destructive" title={t("sorter.rename.failed")} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("sorter.rename.nameLabel")}
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
