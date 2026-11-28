import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { SettingsSection, SettingsSections } from "@/components/settings-section";
import { SettingsSectionsSkeleton } from "@/components/settings-section-skeleton";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Switch } from "@/components/ui/switch";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { useShopCatalogs } from "@/features/business/api/use-shop-catalogs";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { ShopCatalogSourceChecklist } from "@/features/business/components/shop-catalog-source-checklist";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  SHOP_CATALOG_EDITOR_SKELETON_SECTIONS,
  SHOP_CATALOG_GUID_PARAM,
  SHOP_CATALOGS_PATH,
  shopCatalogLinkPath,
} from "@/lib/constants/business";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import type { ShopCatalogEditorFormProps } from "@/lib/interfaces/shop-catalogs";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CARD_RESERVATION_HOLD_DAY_CHOICES,
  shopCatalogFormSchema,
  toShopCatalogFormValues,
  type ShopCatalogFormValues,
} from "@magic-vault/shared";
import { IconBuildingStore, IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

function ShopCatalogEditorForm({ catalog, isSaving, onSubmit }: ShopCatalogEditorFormProps) {
  const { t } = useTranslation("business");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const nameId = useId();
  const showPricesId = useId();
  const showPricesDescriptionId = useId();
  const isPublicId = useId();
  const isPublicDescriptionId = useId();
  const allowsReservationsId = useId();
  const allowsReservationsDescriptionId = useId();
  const reservationsRequireAccountId = useId();
  const reservationsRequireAccountDescriptionId = useId();
  const sourcesId = useId();
  const { data: collections = [] } = useQuery(collectionsQueryOptions);
  const { data: storageLocations = [] } = useQuery(storageLocationsQueryOptions(activeOrg?.id));
  const savedValues = useMemo(() => toShopCatalogFormValues(catalog), [catalog]);
  const form = useForm<ShopCatalogFormValues>({
    resolver: zodResolver(shopCatalogFormSchema),
    values: savedValues,
    resetOptions: { keepDirtyValues: true },
  });
  const allowsReservations = useWatch({ control: form.control, name: "allowsReservations" });
  const { errors, isDirty } = form.formState;
  const [leavePath, setLeavePath] = useState<string | null>(null);

  useEffect(() => {
    if (leavePath) navigate(leavePath);
  }, [leavePath, navigate]);

  const submit = form.handleSubmit((values) =>
    onSubmit(values, (savedGuid) =>
      setLeavePath(catalog ? SHOP_CATALOGS_PATH : shopCatalogLinkPath(savedGuid)),
    ),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 md:gap-2">
      <SettingsSections>
        <SettingsSection heading={t("shopCatalogs.editor.detailsHeading")}>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor={nameId}>{t("shopCatalogs.nameLabel")}</FieldLabel>
            <Input
              id={nameId}
              placeholder={t("shopCatalogs.namePlaceholder")}
              {...form.register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>
        </SettingsSection>

        <SettingsSection heading={t("shopCatalogs.editor.visibilityHeading")}>
          <Controller
            control={form.control}
            name="showsPrices"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={showPricesId}>{t("shopCatalogs.showPrices")}</FieldLabel>
                  <FieldDescription id={showPricesDescriptionId}>
                    {t("shopCatalogs.showPricesDescription")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={showPricesId}
                  aria-describedby={showPricesDescriptionId}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={isPublicId}>{t("shopCatalogs.isPublic")}</FieldLabel>
                  <FieldDescription id={isPublicDescriptionId}>
                    {t("shopCatalogs.isPublicDescription")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={isPublicId}
                  aria-describedby={isPublicDescriptionId}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
        </SettingsSection>

        <SettingsSection heading={t("shopCatalogs.editor.reservationsHeading")}>
          <Controller
            control={form.control}
            name="allowsReservations"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={allowsReservationsId}>
                    {t("shopCatalogs.allowsReservations")}
                  </FieldLabel>
                  <FieldDescription id={allowsReservationsDescriptionId}>
                    {t("shopCatalogs.allowsReservationsDescription")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={allowsReservationsId}
                  aria-describedby={allowsReservationsDescriptionId}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
          {allowsReservations && (
            <Controller
              control={form.control}
              name="reservationHoldDays"
              render={({ field }) => (
                <Field>
                  <span className="text-control font-medium">
                    {t("shopCatalogs.reservationHoldLabel")}
                  </span>
                  <ResponsiveSegmented
                    label={t("shopCatalogs.reservationHoldLabel")}
                    items={CARD_RESERVATION_HOLD_DAY_CHOICES.map((days) => ({
                      key: String(days),
                      label: t("shopCatalogs.reservationHoldDays", { count: days }),
                    }))}
                    value={String(field.value)}
                    onChange={(days) => field.onChange(Number(days))}
                  />
                  <FieldDescription>{t("shopCatalogs.reservationHoldDescription")}</FieldDescription>
                </Field>
              )}
            />
          )}
          {allowsReservations && (
            <Controller
              control={form.control}
              name="reservationsRequireAccount"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={reservationsRequireAccountId}>
                      {t("shopCatalogs.reservationsRequireAccount")}
                    </FieldLabel>
                    <FieldDescription id={reservationsRequireAccountDescriptionId}>
                      {t("shopCatalogs.reservationsRequireAccountDescription")}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id={reservationsRequireAccountId}
                    aria-describedby={reservationsRequireAccountDescriptionId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />
          )}
        </SettingsSection>

        <SettingsSection
          heading={t("shopCatalogs.editor.contentsHeading")}
          description={t("shopCatalogs.dialogDescription")}
        >
          <Field data-invalid={!!errors.collectionGuids}>
            <Controller
              control={form.control}
              name="collectionGuids"
              render={({ field }) => (
                <ShopCatalogSourceChecklist
                  idPrefix={`${sourcesId}-collection`}
                  label={t("shopCatalogs.collectionsLabel")}
                  options={collections.map((collection) => ({
                    guid: collection.guid,
                    name: collection.name,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.collectionGuids]} />
          </Field>
          <Controller
            control={form.control}
            name="storageLocationGuids"
            render={({ field }) => (
              <ShopCatalogSourceChecklist
                idPrefix={`${sourcesId}-location`}
                label={t("shopCatalogs.storageLocationsLabel")}
                options={storageLocations.map((location) => ({
                  guid: location.guid,
                  name: location.name,
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <p className="text-xs text-foreground/70">{t("shopCatalogs.inventoryNote")}</p>
        </SettingsSection>
      </SettingsSections>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-1.5 border-t bg-background/80 px-4 py-2.5 backdrop-blur-2xl md:-mx-3 md:px-3">
        <Button type="button" variant="outline" onClick={() => navigate(SHOP_CATALOGS_PATH)}>
          {tCommon("actions.cancel")}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <IconLoader2 className="animate-spin motion-reduce:animate-none" />}
          {catalog ? t("shopCatalogs.save") : t("shopCatalogs.add")}
        </Button>
      </div>
      <UnsavedChangesGuard
        isDirty={isDirty && !leavePath}
        onDiscard={() => form.reset(savedValues)}
      />
    </form>
  );
}

export function ShopCatalogEditorPage() {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const { [SHOP_CATALOG_GUID_PARAM]: catalogGuid } = useParams();
  const { catalogs, canManage, isLoading, isError, refetch, create, update } = useShopCatalogs();
  const isNew = !catalogGuid;
  const catalog = catalogs.find((candidate) => candidate.guid === catalogGuid) ?? null;
  const title = isNew ? t("shopCatalogs.addTitle") : t("shopCatalogs.editTitle");
  const description = t("shopCatalogs.description");

  const content = access?.isLocked ? (
    <BusinessUpgradeCallout />
  ) : access && !canManage ? (
    <Callout variant="info">{t("shopCatalogs.managersOnly")}</Callout>
  ) : isError ? (
    <LoadErrorCallout message={t("shopCatalogs.loadFailed")} onRetry={() => void refetch()} />
  ) : !access || isLoading ? (
    <SettingsSectionsSkeleton sections={SHOP_CATALOG_EDITOR_SKELETON_SECTIONS} />
  ) : !isNew && !catalog ? (
    <EmptyState icon={IconBuildingStore} title={t("shopCatalogs.editor.notFound")} />
  ) : (
    <ShopCatalogEditorForm
      catalog={catalog}
      isSaving={create.isPending || update.isPending}
      onSubmit={(input, onSaved) => {
        if (catalog) {
          update.mutate({ guid: catalog.guid, input }, { onSuccess: () => onSaved(catalog.guid) });
        } else {
          create.mutate(input, { onSuccess: (created) => onSaved(created.guid) });
        }
      }}
    />
  );

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      {isMobile ? (
        <MobilePageHeader title={title} subtitle={description} backTo={SHOP_CATALOGS_PATH} />
      ) : (
        <PageHeader
          title={title}
          description={description}
          backTo={SHOP_CATALOGS_PATH}
          backLabel={t("views.catalogs")}
          maxWidthClassName="max-w-4xl"
        />
      )}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:gap-2 md:px-3 md:py-2">
        {content}
      </div>
    </div>
  );
}
