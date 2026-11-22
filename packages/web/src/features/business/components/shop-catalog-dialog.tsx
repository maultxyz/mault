import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Switch } from "@/components/ui/switch";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { ShopCatalogSourceChecklist } from "@/features/business/components/shop-catalog-source-checklist";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import type { ShopCatalogDialogProps } from "@/lib/interfaces/shop-catalogs";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CARD_RESERVATION_HOLD_DAY_CHOICES,
  DEFAULT_CARD_RESERVATION_HOLD_DAYS,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS,
  DEFAULT_SHOP_CATALOG_IS_PUBLIC,
  shopCatalogFormSchema,
  toCardReservationHoldDays,
  type ShopCatalogFormValues,
} from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ShopCatalogDialog({
  open,
  onOpenChange,
  catalog,
  isSaving,
  onSubmit,
}: ShopCatalogDialogProps) {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const formId = useId();
  const nameId = useId();
  const showPricesId = useId();
  const showPricesDescriptionId = useId();
  const isPublicId = useId();
  const isPublicDescriptionId = useId();
  const allowsReservationsId = useId();
  const allowsReservationsDescriptionId = useId();
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: open,
  });
  const { data: storageLocations = [] } = useQuery({
    ...storageLocationsQueryOptions(activeOrg?.id),
    enabled: open && !!activeOrg?.id,
  });
  const form = useForm<ShopCatalogFormValues>({
    resolver: zodResolver(shopCatalogFormSchema),
    defaultValues: {
      name: "",
      showsPrices: DEFAULT_SHARE_LINK_SHOWS_PRICES,
      isPublic: DEFAULT_SHOP_CATALOG_IS_PUBLIC,
      allowsReservations: DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS,
      reservationHoldDays: DEFAULT_CARD_RESERVATION_HOLD_DAYS,
      collectionGuids: [],
      storageLocationGuids: [],
    },
  });
  const allowsReservations = form.watch("allowsReservations");
  const { errors } = form.formState;

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: catalog?.name ?? "",
      showsPrices: catalog?.showsPrices ?? DEFAULT_SHARE_LINK_SHOWS_PRICES,
      isPublic: catalog?.isPublic ?? DEFAULT_SHOP_CATALOG_IS_PUBLIC,
      allowsReservations:
        catalog?.allowsReservations ?? DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS,
      reservationHoldDays: toCardReservationHoldDays(catalog?.reservationHoldDays),
      collectionGuids: catalog?.collections.map((source) => source.guid) ?? [],
      storageLocationGuids:
        catalog?.storageLocations.map((source) => source.guid) ?? [],
    });
  }, [open, catalog, form]);

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={catalog ? t("shopCatalogs.editTitle") : t("shopCatalogs.addTitle")}
      description={t("shopCatalogs.dialogDescription")}
      footer={
        <Button type="submit" form={formId} disabled={isSaving} className="w-full">
          {isSaving && <IconLoader2 className="animate-spin" />}
          {catalog ? t("shopCatalogs.save") : t("shopCatalogs.add")}
        </Button>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4 md:gap-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor={nameId}>{t("shopCatalogs.nameLabel")}</FieldLabel>
          <Input
            id={nameId}
            placeholder={t("shopCatalogs.namePlaceholder")}
            autoFocus
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Controller
          control={form.control}
          name="showsPrices"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={showPricesId}>
                  {t("shopCatalogs.showPrices")}
                </FieldLabel>
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
                <FieldDescription>
                  {t("shopCatalogs.reservationHoldDescription")}
                </FieldDescription>
              </Field>
            )}
          />
        )}
        <Field data-invalid={!!errors.collectionGuids}>
          <Controller
            control={form.control}
            name="collectionGuids"
            render={({ field }) => (
              <ShopCatalogSourceChecklist
                idPrefix={`${formId}-collection`}
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
              idPrefix={`${formId}-location`}
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
      </form>
    </DynamicDialog>
  );
}
