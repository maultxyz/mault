import { LabelSheetOptionFields } from "@/components/label-sheet-option-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { intakeLotsQueryOptions } from "@/features/business/api/business";
import { useCollections } from "@/features/collections/api/use-collections";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { PRICE_LABEL_INTAKE_LOTS_PAGE } from "@/lib/constants/price-labels";
import type {
  PriceLabelOptionsFormProps,
  PriceLabelSourceOption,
} from "@/lib/interfaces/price-labels";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { PRICE_LABEL_SOURCES, type PriceLabelSource } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useController, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PriceLabelOptionsForm({ form, orgId, loadedSourceName }: PriceLabelOptionsFormProps) {
  const { t } = useTranslation("business");
  const { collections } = useCollections();
  const source = useWatch({ control: form.control, name: "source" });
  const { data: locations = [] } = useQuery({
    ...storageLocationsQueryOptions(orgId),
    enabled: source === "location",
  });
  const { data: lotPage } = useQuery({
    ...intakeLotsQueryOptions(orgId, PRICE_LABEL_INTAKE_LOTS_PAGE),
    enabled: source === "lot",
  });
  const { field: sourceField } = useController({ control: form.control, name: "source" });
  const { field: sourceGuidField } = useController({ control: form.control, name: "sourceGuid" });
  const { field: showsPricesField } = useController({ control: form.control, name: "showsPrices" });
  const { field: showsBarcodesField } = useController({ control: form.control, name: "showsBarcodes" });
  const { field: templateField } = useController({ control: form.control, name: "templateId" });
  const { field: startPositionField, fieldState: startPositionState } = useController({
    control: form.control,
    name: "startPosition",
  });

  const sourceOptions: PriceLabelSourceOption[] =
    source === "collection"
      ? collections.map((collection) => ({ guid: collection.guid, name: collection.name }))
      : source === "location"
        ? locations.map((location) => ({ guid: location.guid, name: location.name }))
        : (lotPage?.items ?? []).map((lot) => ({ guid: lot.guid, name: lot.customerName }));
  const selectedSourceName =
    sourceOptions.find((option) => option.guid === sourceGuidField.value)?.name ?? loadedSourceName;
  if (
    sourceGuidField.value &&
    selectedSourceName &&
    !sourceOptions.some((option) => option.guid === sourceGuidField.value)
  ) {
    sourceOptions.unshift({ guid: sourceGuidField.value, name: selectedSourceName });
  }

  const changeSource = (nextSource: PriceLabelSource) => {
    sourceField.onChange(nextSource);
    form.setValue("sourceGuid", "");
    form.setValue("deselectedScanIds", []);
    form.setValue("customPrices", {});
  };
  const changeSourceGuid = (nextGuid: string) => {
    sourceGuidField.onChange(nextGuid);
    form.setValue("deselectedScanIds", []);
    form.setValue("customPrices", {});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("priceLabels.form.title")}</CardTitle>
        <CardDescription>{t("priceLabels.form.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 md:gap-2">
        <div data-tour="labels-source" className="flex flex-col gap-3 md:gap-2">
          <Field>
            <FieldLabel htmlFor="price-label-source">{t("priceLabels.form.source")}</FieldLabel>
            <Select
              value={source}
              onValueChange={(value) => {
                if (value) changeSource(value as PriceLabelSource);
              }}
            >
              <SelectTrigger id="price-label-source" className="w-full">
                <SelectValue>{t(`priceLabels.sources.${source}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRICE_LABEL_SOURCES.map((sourceOption) => (
                  <SelectItem key={sourceOption} value={sourceOption}>
                    {t(`priceLabels.sources.${sourceOption}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="price-label-source-item">
              {t(`priceLabels.sourceItems.${source}`)}
            </FieldLabel>
            <Select
              value={sourceGuidField.value || null}
              onValueChange={(value) => {
                if (value) changeSourceGuid(value);
              }}
            >
              <SelectTrigger id="price-label-source-item" className="w-full">
                <SelectValue>
                  {selectedSourceName ?? t(`priceLabels.sourcePlaceholders.${source}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.guid} value={option.guid}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div data-tour="labels-prices" className="flex flex-col gap-3 md:gap-2">
          <label className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-control font-medium">{t("priceLabels.form.showPrices")}</span>
              <span className="text-xs text-foreground/70">{t("priceLabels.form.showPricesHint")}</span>
            </span>
            <Switch
              aria-label={t("priceLabels.form.showPrices")}
              checked={showsPricesField.value}
              onCheckedChange={showsPricesField.onChange}
            />
          </label>
          {showsPricesField.value && (
            <p className="text-xs text-foreground/70">
              <Trans
                t={t}
                i18nKey="priceLabels.form.sellPriceHint"
                components={{
                  settingsLink: (
                    <Link
                      to={SETTINGS_PATHS.pricing}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    />
                  ),
                }}
              />
            </p>
          )}
          <label className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-control font-medium">{t("priceLabels.form.showBarcodes")}</span>
              <span className="text-xs text-foreground/70">{t("priceLabels.form.showBarcodesHint")}</span>
            </span>
            <Switch
              aria-label={t("priceLabels.form.showBarcodes")}
              checked={showsBarcodesField.value}
              onCheckedChange={showsBarcodesField.onChange}
            />
          </label>
        </div>
        <div data-tour="labels-sheet" className="flex flex-col gap-3 md:gap-2">
          <LabelSheetOptionFields
            idPrefix="price-label"
            templateId={templateField.value}
            onTemplateIdChange={templateField.onChange}
            startPositionField={startPositionField}
            startPositionError={startPositionState.error}
          />
        </div>
      </CardContent>
    </Card>
  );
}
