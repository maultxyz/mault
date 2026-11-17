import { zodResolver } from "@hookform/resolvers/zod";
import {
  INTAKE_TRANSFER_NEW_COLLECTION_OPTION,
  intakeTransferSchema,
  type IntakeTransferFormValues,
} from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { intakeLotQueryOptions, transferIntakeLot } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function TransferIntakeLotScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const { refresh, announce } = useBusinessAction();
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const lot = useQuery(intakeLotQueryOptions(guid)).data;
  const { data: collections = [] } = useQuery(collectionsQueryOptions(orgId));
  const targets = useMemo(
    () =>
      lot
        ? collections.filter(
            (collection) =>
              collection.guid !== lot.collectionGuid && (collection.game?.guid ?? null) === lot.collectionGameGuid,
          )
        : [],
    [collections, lot],
  );
  const form = useForm<IntakeTransferFormValues>({
    resolver: zodResolver(intakeTransferSchema),
    defaultValues: { targetCollectionGuid: INTAKE_TRANSFER_NEW_COLLECTION_OPTION, newCollectionName: "", deleteSource: true },
  });
  const target = form.watch("targetCollectionGuid");
  const isNew = target === INTAKE_TRANSFER_NEW_COLLECTION_OPTION;

  useEffect(() => {
    if (!lot) return;
    form.reset({
      targetCollectionGuid: targets[0]?.guid ?? INTAKE_TRANSFER_NEW_COLLECTION_OPTION,
      newCollectionName: "",
      deleteSource: lot.ownsCollection,
    });
  }, [lot, targets, form]);

  const transfer = useMutation({
    mutationFn: (values: IntakeTransferFormValues) =>
      transferIntakeLot(guid, {
        targetCollectionGuid: isNew ? null : values.targetCollectionGuid,
        newCollectionName: isNew ? values.newCollectionName : null,
        deleteSource: values.deleteSource,
      }),
    onSuccess: (result) => {
      router.back();
      announce(t("business.transfer.moved", { count: result.moved }), "success");
    },
    onSettled: () => void refresh(),
  });
  const submit = form.handleSubmit((values) => transfer.mutate(values));

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("business.transfer.title")}
        subtitle={lot ? t("business.transfer.description", { name: lot.collectionName }) : null}
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("business.transfer.move")}
            loading={transfer.isPending}
            disabled={!lot}
            onPress={() => void submit()}
          />
        }
      >
        {transfer.isError ? (
          <Callout
            tone="destructive"
            title={transfer.error instanceof Error ? transfer.error.message : t("business.actionFailed")}
          />
        ) : null}
        <SelectField
          label={t("business.transfer.target")}
          value={isNew ? t("business.transfer.newCollection") : (targets.find((collection) => collection.guid === target)?.name ?? null)}
          placeholder={t("business.intake.collectionPlaceholder")}
          onPress={() => setTargetSheetOpen(true)}
        />
        {targets.length === 0 ? (
          <AppText size="xs" tone="secondary">
            {t("business.transfer.noTargets")}
          </AppText>
        ) : null}
        {isNew ? (
          <Controller
            control={form.control}
            name="newCollectionName"
            render={({ field, fieldState }) => (
              <TextField
                label={t("business.transfer.newName")}
                placeholder={t("business.transfer.newNamePlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
              />
            )}
          />
        ) : null}
        <Controller
          control={form.control}
          name="deleteSource"
          render={({ field }) => (
            <SwitchRow
              title={t("business.transfer.deleteSource", { name: lot?.collectionName ?? "" })}
              description={t("business.transfer.deleteSourceHint")}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </PinnedActionsLayout>
      <OptionSheet
        visible={targetSheetOpen}
        title={t("business.transfer.target")}
        options={[
          ...targets.map((collection) => ({ value: collection.guid, label: collection.name })),
          { value: INTAKE_TRANSFER_NEW_COLLECTION_OPTION, label: t("business.transfer.newCollection") },
        ]}
        selected={[target]}
        onSelect={(value) => {
          setTargetSheetOpen(false);
          form.setValue("targetCollectionGuid", value, { shouldValidate: true });
        }}
        onClose={() => setTargetSheetOpen(false)}
      />
    </View>
  );
}
