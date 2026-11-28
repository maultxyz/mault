import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { AccessibilityInfo, View } from "react-native";
import {
  CARD_RESERVATION_HOLD_DAY_CHOICES,
  shopCatalogFormSchema,
  toShopCatalogFormValues,
  type ShopCatalogFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwitchRow } from "@/components/ui/switch-row";
import { SwitchRowSkeleton } from "@/components/ui/switch-row-skeleton";
import { TextField } from "@/components/ui/text-field";
import { createShopCatalog, shopCatalogsQueryOptions, updateShopCatalog } from "@/features/business/api/shop-catalogs";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useDiscardChangesGuard } from "@/features/settings/lib/use-leave-guard";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { ShopCatalogSourceSwitchesProps } from "@/lib/interfaces/settings";

function ShopCatalogSourceSwitches({ options, value, onChange, emptyLabel }: ShopCatalogSourceSwitchesProps) {
  if (options.length === 0) {
    return (
      <AppText size="xs" tone="secondary">
        {emptyLabel}
      </AppText>
    );
  }
  return options.map((option) => (
    <SwitchRow
      key={option.guid}
      title={option.name}
      value={value.includes(option.guid)}
      onValueChange={(on) => onChange(on ? [...value, option.guid] : value.filter((guid) => guid !== option.guid))}
    />
  ));
}

export default function ShopCatalogEditScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const list = useQuery(shopCatalogsQueryOptions(orgId, !!access.data?.canManageSettings));
  const catalog = guid ? (list.data?.find((candidate) => candidate.guid === guid) ?? null) : null;
  const isNew = !guid;
  const collections = useQuery(collectionsQueryOptions(orgId));
  const storageLocations = useQuery(storageLocationsQueryOptions(orgId, true));
  const isLoadingForm =
    (!isNew && (access.isLoading || list.isLoading)) || collections.isLoading || storageLocations.isLoading;
  const isLoadError =
    (!isNew && ((access.isError && !access.data) || (list.isError && !list.data))) ||
    (collections.isError && !collections.data) ||
    (storageLocations.isError && !storageLocations.data);
  const retryLoad = () => {
    void collections.refetch();
    void storageLocations.refetch();
    if (isNew) return;
    void access.refetch();
    if (access.data?.canManageSettings) void list.refetch();
  };
  const savedValues = useMemo(() => toShopCatalogFormValues(catalog), [catalog]);
  const form = useForm<ShopCatalogFormValues>({
    resolver: zodResolver(shopCatalogFormSchema),
    values: savedValues,
    resetOptions: { keepDirtyValues: true },
  });
  const allowsReservations = form.watch("allowsReservations");
  const { leaveWithoutGuard } = useDiscardChangesGuard(form.formState.isDirty);

  const save = useMutation({
    mutationFn: (values: ShopCatalogFormValues) => (catalog ? updateShopCatalog(catalog.guid, values) : createShopCatalog(values)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["business", "shop-catalogs", orgId] });
      if (isNew) {
        AccessibilityInfo.announceForAccessibility(t("settings.shopCatalogs.created"));
        leaveWithoutGuard(() => router.replace({ pathname: "/business/shop-catalog-link", params: { guid: saved.guid } }));
        return;
      }
      AccessibilityInfo.announceForAccessibility(t("settings.shopCatalogs.saved"));
      leaveWithoutGuard();
    },
  });

  return (
    <Screen
      header={
        <PageHeader
          title={isNew ? t("settings.shopCatalogs.addTitle") : t("settings.shopCatalogs.editTitle")}
          onBack={() => router.back()}
        />
      }
      footer={
        <Button
          size="lg"
          label={isNew ? t("settings.shopCatalogs.add") : t("settings.shopCatalogs.save")}
          loading={save.isPending}
          disabled={isLoadError || isLoadingForm || (!isNew && !catalog)}
          onPress={form.handleSubmit((values) => save.mutate(values))}
        />
      }
    >
      {save.isError ? <Callout tone="destructive" title={save.error.message} /> : null}
      {isLoadError ? (
        <QueryErrorState
          onRetry={retryLoad}
          isRetrying={access.isFetching || list.isFetching || collections.isFetching || storageLocations.isFetching}
        />
      ) : isLoadingForm ? (
        <>
          <FormSkeleton fields={1} />
          {Array.from({ length: 3 }).map((_, index) => (
            <SwitchRowSkeleton key={index} hasDescription />
          ))}
          <SectionSkeleton>
            <SwitchRowSkeleton />
            <SwitchRowSkeleton />
          </SectionSkeleton>
        </>
      ) : !isNew && !catalog ? (
        <Callout tone="info" title={t("settings.shopCatalogs.notFound")} />
      ) : (
        <>
          <SettingsSection title={t("settings.shopCatalogs.detailsHeading")}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("settings.shopCatalogs.nameLabel")}
                  placeholder={t("settings.shopCatalogs.namePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  returnKeyType="done"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
          </SettingsSection>
          <SettingsSection title={t("settings.shopCatalogs.visibilityHeading")}>
            <Controller
              control={form.control}
              name="showsPrices"
              render={({ field }) => (
                <SwitchRow
                  title={t("settings.shopCatalogs.showPrices")}
                  description={t("settings.shopCatalogs.showPricesDescription")}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <SwitchRow
                  title={t("settings.shopCatalogs.isPublic")}
                  description={t("settings.shopCatalogs.isPublicDescription")}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
          </SettingsSection>
          <SettingsSection title={t("settings.shopCatalogs.reservationsHeading")}>
            <Controller
              control={form.control}
              name="allowsReservations"
              render={({ field }) => (
                <SwitchRow
                  title={t("settings.shopCatalogs.allowsReservations")}
                  description={t("settings.shopCatalogs.allowsReservationsDescription")}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            {allowsReservations ? (
              <Controller
                control={form.control}
                name="reservationHoldDays"
                render={({ field }) => (
                  <>
                    <AppText size="sm" weight="semibold">
                      {t("settings.shopCatalogs.reservationHoldLabel")}
                    </AppText>
                    <SegmentedControl
                      options={CARD_RESERVATION_HOLD_DAY_CHOICES.map((days) => ({
                        value: String(days),
                        label: t("settings.shopCatalogs.reservationHoldDays", { count: days }),
                      }))}
                      value={String(field.value)}
                      onChange={(days) => field.onChange(Number(days))}
                    />
                    <AppText size="xs" tone="secondary">
                      {t("settings.shopCatalogs.reservationHoldDescription")}
                    </AppText>
                  </>
                )}
              />
            ) : null}
            {allowsReservations ? (
              <Controller
                control={form.control}
                name="reservationsRequireAccount"
                render={({ field }) => (
                  <SwitchRow
                    title={t("settings.shopCatalogs.reservationsRequireAccount")}
                    description={t("settings.shopCatalogs.reservationsRequireAccountDescription")}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            ) : null}
          </SettingsSection>
          <SettingsSection
            title={t("settings.shopCatalogs.contentsHeading")}
            description={t("settings.shopCatalogs.dialogDescription")}
          >
            <Controller
              control={form.control}
              name="collectionGuids"
              render={({ field, fieldState }) => (
                <View>
                  <SectionHeader title={t("settings.shopCatalogs.collectionsLabel")} />
                  <ShopCatalogSourceSwitches
                    options={(collections.data ?? []).map((collection) => ({ guid: collection.guid, name: collection.name }))}
                    value={field.value}
                    onChange={field.onChange}
                    emptyLabel={t("settings.shopCatalogs.noSources")}
                  />
                  {fieldState.error ? (
                    <AppText size="xs" style={{ color: colors.destructiveForeground }} accessibilityRole="alert">
                      {translateFormErrorMessage(t, fieldState.error.message)}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="storageLocationGuids"
              render={({ field }) => (
                <View>
                  <SectionHeader title={t("settings.shopCatalogs.storageLocationsLabel")} />
                  <ShopCatalogSourceSwitches
                    options={(storageLocations.data ?? []).map((location) => ({ guid: location.guid, name: location.name }))}
                    value={field.value}
                    onChange={field.onChange}
                    emptyLabel={t("settings.shopCatalogs.noSources")}
                  />
                </View>
              )}
            />
            <AppText size="xs" tone="secondary">
              {t("settings.shopCatalogs.inventoryNote")}
            </AppText>
          </SettingsSection>
        </>
      )}
    </Screen>
  );
}
