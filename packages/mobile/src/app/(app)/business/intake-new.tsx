import { zodResolver } from "@hookform/resolvers/zod";
import { BUY_SOURCE_TYPES, buyStartSchema, type BuySourceType, type BuyStartFormValues } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { createIntakeLot } from "@/features/business/api/business";
import { readBuyStartDefaults, saveBuyStartDefaults } from "@/features/business/lib/buy-start-defaults";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { billingQueryOptions } from "@/features/org/api/billing";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import {
  BUSINESS_INTAKE_QUERY_KEY,
  BUY_NO_STORAGE_LOCATION_OPTION,
  BUY_START_DEFAULT_VALUES,
} from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function StartBuyScreen() {
  const { collectionGuid: requestedCollectionGuid } = useLocalSearchParams<{ collectionGuid?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { collection: scanTargetCollection, collections, setScanTargetGuid } = useScanTarget();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const canStore = !!billing && billing.storage !== false;
  const { data: storageLocations = [] } = useQuery(storageLocationsQueryOptions(orgId, canStore));
  const [sheet, setSheet] = useState<"collection" | "location" | null>(null);
  const form = useForm<BuyStartFormValues>({
    resolver: zodResolver(buyStartSchema),
    defaultValues: BUY_START_DEFAULT_VALUES,
  });
  const sourceType = form.watch("sourceType");
  const collectionGuid = form.watch("collectionGuid");
  const storageLocationGuid = form.watch("storageLocationGuid");
  const collectionError = form.formState.errors.collectionGuid?.message;

  useEffect(() => {
    if (!orgId || collections.length === 0 || form.getValues("collectionGuid")) return;
    const remembered = readBuyStartDefaults(orgId);
    const requestedCollection = collections.find((candidate) => candidate.guid === requestedCollectionGuid);
    const rememberedCollection = collections.find((candidate) => candidate.guid === remembered?.collectionGuid);
    if (remembered) form.setValue("sourceType", remembered.sourceType);
    form.setValue(
      "collectionGuid",
      requestedCollection?.guid ?? rememberedCollection?.guid ?? scanTargetCollection?.guid ?? collections[0].guid,
    );
    if (remembered?.storageLocationGuid) form.setValue("storageLocationGuid", remembered.storageLocationGuid);
  }, [orgId, collections, scanTargetCollection, requestedCollectionGuid, form]);

  useEffect(() => {
    const current = form.getValues("storageLocationGuid");
    if (current && storageLocations.length > 0 && !storageLocations.some((location) => location.guid === current)) {
      form.setValue("storageLocationGuid", "");
    }
  }, [storageLocations, form]);

  const create = useMutation({
    mutationFn: (values: BuyStartFormValues) =>
      createIntakeLot({
        sourceType: values.sourceType,
        customerName: values.name,
        customerContact: values.sourceType === "customer" ? values.contact || null : null,
        notes: values.notes || null,
        collectionGuid: values.collectionGuid,
        destinationStorageLocationGuid: canStore && values.storageLocationGuid ? values.storageLocationGuid : null,
      }),
    onSuccess: (_created, values) => {
      if (orgId) {
        saveBuyStartDefaults(orgId, {
          sourceType: values.sourceType,
          collectionGuid: values.collectionGuid,
          storageLocationGuid: values.storageLocationGuid,
        });
      }
      void queryClient.invalidateQueries({ queryKey: BUSINESS_INTAKE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      setScanTargetGuid(values.collectionGuid);
      router.back();
      router.navigate("/scan");
    },
  });

  const selectedCollection = collections.find((candidate) => candidate.guid === collectionGuid) ?? null;
  const selectedLocation = storageLocations.find((location) => location.guid === storageLocationGuid) ?? null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("business.buy.startTitle")} subtitle={t("business.buy.startDescription")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            icon="scan"
            label={t("business.buy.startAndScan")}
            loading={create.isPending}
            onPress={form.handleSubmit((values) => create.mutate(values))}
          />
        }
      >
        {create.isError ? (
          <Callout
            tone="destructive"
            title={t("business.intake.createFailed")}
            description={create.error instanceof Error ? create.error.message : undefined}
          />
        ) : null}
        <View style={{ gap: SPACING.xs }}>
          <AppText size="sm" weight="medium">
            {t("business.buy.sourceType")}
          </AppText>
          <SegmentedControl<BuySourceType>
            value={sourceType}
            onChange={(value) => form.setValue("sourceType", value)}
            options={BUY_SOURCE_TYPES.map((value) => ({ value, label: t(`business.buy.sourceTypes.${value}`) }))}
          />
        </View>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t(`business.buy.nameLabel.${sourceType}`)}
              placeholder={t(`business.buy.namePlaceholder.${sourceType}`)}
              autoComplete={sourceType === "customer" ? "name" : "off"}
              textContentType={sourceType === "customer" ? "name" : "none"}
              autoCapitalize="words"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
        {sourceType === "customer" ? (
          <Controller
            control={form.control}
            name="contact"
            render={({ field, fieldState }) => (
              <TextField
                label={t("business.intake.customerContact")}
                placeholder={t("business.intake.customerContactPlaceholder")}
                autoCapitalize="none"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
              />
            )}
          />
        ) : null}
        <View style={{ gap: SPACING.xs }}>
          <SelectField
            label={t("business.buy.collection")}
            value={selectedCollection?.name ?? null}
            placeholder={t("business.intake.collectionPlaceholder")}
            onPress={() => setSheet("collection")}
          />
          {collectionError ? (
            <AppText size="xs" tone="destructive" accessibilityLiveRegion="polite">
              {translateFormErrorMessage(t, collectionError)}
            </AppText>
          ) : null}
          <AppText size="xs" tone="secondary">
            {t("business.buy.collectionHint")}
          </AppText>
        </View>
        {canStore ? (
          <View style={{ gap: SPACING.xs }}>
            <SelectField
              label={t("business.buy.storageLocation")}
              value={selectedLocation?.name ?? t("business.buy.noStorageLocation")}
              placeholder={t("business.buy.noStorageLocation")}
              onPress={() => setSheet("location")}
            />
            <AppText size="xs" tone="secondary">
              {t("business.buy.storageLocationHint")}
            </AppText>
          </View>
        ) : null}
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.intake.notes")}
              multiline
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
      </PinnedActionsLayout>
      <OptionSheet
        visible={sheet === "collection"}
        title={t("business.buy.collection")}
        options={collections.map((candidate) => ({ value: candidate.guid, label: candidate.name }))}
        selected={[collectionGuid]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("collectionGuid", value, { shouldValidate: true });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "location"}
        title={t("business.buy.storageLocation")}
        options={[
          { value: BUY_NO_STORAGE_LOCATION_OPTION, label: t("business.buy.noStorageLocation") },
          ...storageLocations.map((location) => ({ value: location.guid, label: location.name })),
        ]}
        selected={[storageLocationGuid || BUY_NO_STORAGE_LOCATION_OPTION]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("storageLocationGuid", value === BUY_NO_STORAGE_LOCATION_OPTION ? "" : value);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
