import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  isCardCondition,
  piHostScanStartBody,
  piHostScanStartFormSchema,
  type PiHostScanStartFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useRaspberryPiScan, useRaspberryPis } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SPACING } from "@/lib/constants/theme";
import type { RaspberryPiStartPicker } from "@/lib/interfaces/raspberry-pis";

export default function StartRaspberryPiScanScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { guid = "" } = useLocalSearchParams<{ guid?: string }>();
  const { query } = useRaspberryPis();
  const host = query.data?.hosts.find((candidate) => candidate.guid === guid);
  const { data: collections = [] } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const scan = useRaspberryPiScan(guid);
  const [openPicker, setOpenPicker] = useState<RaspberryPiStartPicker>(null);
  const form = useForm<PiHostScanStartFormValues>({
    resolver: zodResolver(piHostScanStartFormSchema),
    values: {
      collectionGuid: collections[0]?.guid ?? "",
      condition: DEFAULT_CARD_CONDITION,
      foilType: "",
      preferredSetCodes: "",
      autoFeed: true,
      allowDuplicates: true,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const collectionGuid = useWatch({ control: form.control, name: "collectionGuid" });
  const foilTypes = collections.find((collection) => collection.guid === collectionGuid)?.game?.foilTypes ?? [];
  const collectionName = (value: string) => collections.find((collection) => collection.guid === value)?.name;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("settings.raspberryPis.startTitle", { name: host?.name ?? "" })}
        subtitle={t("settings.raspberryPis.startDescription")}
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            icon="play"
            label={t("settings.raspberryPis.start")}
            loading={scan.isPending}
            onPress={form.handleSubmit((values) =>
              scan.mutate({ kind: "start", body: piHostScanStartBody(values) }, { onSuccess: () => router.back() }),
            )}
          />
        }
      >
        <Controller
          control={form.control}
          name="collectionGuid"
          render={({ field, fieldState }) => (
            <View style={{ gap: SPACING.xs }}>
              <SelectField
                label={t("settings.raspberryPis.collectionLabel")}
                value={collectionName(field.value) ?? null}
                placeholder={t("settings.raspberryPis.collectionPlaceholder")}
                onPress={() => setOpenPicker("collection")}
              />
              {fieldState.error ? (
                <AppText size="xs" tone="destructive" accessibilityRole="alert">
                  {translateFormErrorMessage(t, fieldState.error.message)}
                </AppText>
              ) : null}
              <OptionSheet
                visible={openPicker === "collection"}
                title={t("settings.raspberryPis.collectionLabel")}
                options={collections.map((collection) => ({ value: collection.guid, label: collection.name }))}
                selected={field.value ? [field.value] : []}
                onSelect={(value) => {
                  setOpenPicker(null);
                  field.onChange(value);
                  form.setValue("foilType", "");
                }}
                onClose={() => setOpenPicker(null)}
              />
            </View>
          )}
        />
        <Controller
          control={form.control}
          name="condition"
          render={({ field }) => (
            <>
              <SelectField
                label={t("settings.raspberryPis.conditionLabel")}
                value={t(`cardDetail.conditions.${field.value}`)}
                placeholder={t("settings.raspberryPis.conditionLabel")}
                onPress={() => setOpenPicker("condition")}
              />
              <OptionSheet
                visible={openPicker === "condition"}
                title={t("settings.raspberryPis.conditionLabel")}
                options={CARD_CONDITIONS.map((condition) => ({
                  value: condition,
                  label: t(`cardDetail.conditions.${condition}`),
                }))}
                selected={[field.value]}
                onSelect={(value) => {
                  setOpenPicker(null);
                  if (isCardCondition(value)) field.onChange(value);
                }}
                onClose={() => setOpenPicker(null)}
              />
            </>
          )}
        />
        {foilTypes.length > 0 ? (
          <Controller
            control={form.control}
            name="foilType"
            render={({ field }) => (
              <>
                <SelectField
                  label={t("settings.raspberryPis.foilLabel")}
                  value={field.value || t("settings.raspberryPis.foilAuto")}
                  placeholder={t("settings.raspberryPis.foilAuto")}
                  onPress={() => setOpenPicker("foil")}
                />
                <OptionSheet
                  visible={openPicker === "foil"}
                  title={t("settings.raspberryPis.foilLabel")}
                  description={t("settings.raspberryPis.foilDescription")}
                  options={[
                    { value: "", label: t("settings.raspberryPis.foilAuto") },
                    ...foilTypes.map((foilType) => ({ value: foilType, label: foilType })),
                  ]}
                  selected={[field.value]}
                  onSelect={(value) => {
                    setOpenPicker(null);
                    field.onChange(value);
                  }}
                  onClose={() => setOpenPicker(null)}
                />
              </>
            )}
          />
        ) : null}
        <Controller
          control={form.control}
          name="preferredSetCodes"
          render={({ field }) => (
            <TextField
              label={t("settings.raspberryPis.setsLabel")}
              placeholder={t("settings.raspberryPis.setsPlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
            />
          )}
        />
        <AppText size="sm" tone="secondary">
          {t("settings.raspberryPis.setsDescription")}
        </AppText>
        <Controller
          control={form.control}
          name="autoFeed"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.raspberryPis.autoFeedLabel")}
              description={t("settings.raspberryPis.autoFeedDescription")}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="allowDuplicates"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.raspberryPis.duplicatesLabel")}
              description={t("settings.raspberryPis.duplicatesDescription")}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
