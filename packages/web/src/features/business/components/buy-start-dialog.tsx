import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createIntakeLot } from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import {
  readBuyStartMemory,
  writeBuyStartMemory,
} from "@/features/business/lib/buy-start-memory";
import { useCollections } from "@/features/collections/api/use-collections";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import {
  BUY_NO_STORAGE_LOCATION_OPTION,
  BUY_START_DEFAULT_VALUES,
} from "@/lib/constants/business";
import { SCANNER_PATH } from "@/lib/constants/scanner";
import type { BuyStartDialogProps } from "@/lib/interfaces/business";
import {
  BUY_SOURCE_TYPES,
  buyStartSchema,
  type BuyStartFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function BuyStartDialog({
  open,
  onOpenChange,
  defaultCollectionGuid,
  opensScannerAfterStart = true,
}: BuyStartDialogProps) {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const { orgId } = useBusinessAccess();
  const { collections, activeCollection, activateCollection } = useCollections();
  const { data: locations = [] } = useQuery({
    ...storageLocationsQueryOptions(orgId),
    enabled: !!orgId && open,
  });
  const run = useBusinessAction();
  const form = useForm<BuyStartFormValues>({
    resolver: zodResolver(buyStartSchema),
    defaultValues: BUY_START_DEFAULT_VALUES,
    mode: "onChange",
  });
  const sourceType = useWatch({ control: form.control, name: "sourceType" });

  useEffect(() => {
    if (!open) return;
    const memory = readBuyStartMemory(orgId);
    const preferredCollection = collections.find(
      (collection) => collection.guid === defaultCollectionGuid,
    );
    const rememberedCollection = collections.find(
      (collection) => collection.guid === memory?.collectionGuid,
    );
    form.reset({
      ...BUY_START_DEFAULT_VALUES,
      collectionGuid:
        preferredCollection?.guid ??
        rememberedCollection?.guid ??
        activeCollection?.guid ??
        collections[0]?.guid ??
        "",
      storageLocationGuid: memory?.storageLocationGuid ?? "",
    });
  }, [open, orgId, defaultCollectionGuid, activeCollection, collections, form]);

  useEffect(() => {
    const current = form.getValues("storageLocationGuid");
    if (current && locations.length > 0 && !locations.some((location) => location.guid === current)) {
      form.setValue("storageLocationGuid", "");
    }
  }, [locations, form]);

  const submit = async (values: BuyStartFormValues) => {
    const isCustomer = values.sourceType === "customer";
    const result = await run(
      () =>
        createIntakeLot({
          sourceType: values.sourceType,
          collectionGuid: values.collectionGuid,
          destinationStorageLocationGuid: values.storageLocationGuid || null,
          customerName: values.name,
          customerContact: isCustomer ? values.contact || null : null,
          notes: values.notes || null,
        }),
      t("intake.created"),
    );
    if (!result?.data) return;
    writeBuyStartMemory(orgId, {
      collectionGuid: values.collectionGuid,
      storageLocationGuid: values.storageLocationGuid,
    });
    onOpenChange(false);
    if (values.collectionGuid !== activeCollection?.guid) {
      await activateCollection(values.collectionGuid);
    }
    if (opensScannerAfterStart) navigate(SCANNER_PATH);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("intake.newTitle")}</DialogTitle>
          <DialogDescription>{t("intake.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id="buy-start-form"
          className="flex flex-col gap-3 md:gap-2"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            name="sourceType"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("intake.sourceType")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("intake.sourceType")}
                  items={BUY_SOURCE_TYPES.map((type) => ({
                    key: type,
                    label: t(`intake.sourceTypes.${type}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="buy-name">{t(`intake.nameLabels.${sourceType}`)}</FieldLabel>
                <Input
                  {...field}
                  id="buy-name"
                  autoFocus
                  placeholder={t(`intake.namePlaceholders.${sourceType}`)}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {sourceType === "customer" && (
            <Controller
              name="contact"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="buy-contact">{t("intake.customerContact")}</FieldLabel>
                  <Input
                    {...field}
                    id="buy-contact"
                    placeholder={t("intake.customerContactPlaceholder")}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          <Controller
            name="collectionGuid"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="buy-collection">{t("intake.collection")}</FieldLabel>
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger id="buy-collection" aria-invalid={fieldState.invalid}>
                    <SelectValue>
                      {collections.find((collection) => collection.guid === field.value)?.name ??
                        t("intake.chooseCollection")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.guid} value={collection.guid}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t("intake.collectionHint")}</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="storageLocationGuid"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="buy-location">{t("intake.storageLocation")}</FieldLabel>
                <Select
                  value={field.value || BUY_NO_STORAGE_LOCATION_OPTION}
                  onValueChange={(value) =>
                    field.onChange(
                      !value || value === BUY_NO_STORAGE_LOCATION_OPTION ? "" : value,
                    )
                  }
                >
                  <SelectTrigger id="buy-location">
                    <SelectValue>
                      {locations.find((location) => location.guid === field.value)?.name ??
                        t("intake.noStorageLocation")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BUY_NO_STORAGE_LOCATION_OPTION}>
                      {t("intake.noStorageLocation")}
                    </SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.guid} value={location.guid}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t("intake.storageLocationHint")}</FieldDescription>
              </Field>
            )}
          />
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="buy-notes">{t("intake.notes")}</FieldLabel>
                <Textarea {...field} id="buy-notes" rows={3} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="buy-start-form"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("intake.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
