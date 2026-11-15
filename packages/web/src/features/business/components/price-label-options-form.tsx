import { LabelSheetOptionFields } from "@/components/label-sheet-option-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import {
  PRICE_LABEL_ROUNDING_MODES,
  PRICE_LABEL_SOURCES,
  type PriceLabelRoundingMode,
  type PriceLabelSource,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useController, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  const { field: roundingField } = useController({ control: form.control, name: "rounding" });
  const { field: markupField, fieldState: markupState } = useController({
    control: form.control,
    name: "markupPercent",
  });
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
        <div className="flex flex-col gap-3 md:gap-2">
          <Field data-invalid={markupState.invalid || undefined}>
            <FieldLabel htmlFor="price-label-markup">{t("priceLabels.form.markup")}</FieldLabel>
            <Input
              id="price-label-markup"
              type="number"
              inputMode="decimal"
              step="any"
              name={markupField.name}
              ref={markupField.ref}
              onBlur={markupField.onBlur}
              value={Number.isNaN(markupField.value) ? "" : markupField.value}
              onChange={(event) => markupField.onChange(event.target.valueAsNumber)}
              aria-invalid={markupState.invalid}
              aria-describedby="price-label-markup-hint"
            />
            <p id="price-label-markup-hint" className="text-xs text-foreground/70">
              {t("priceLabels.form.markupHint")}
            </p>
            {markupState.invalid && <FieldError errors={[markupState.error]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="price-label-rounding">{t("priceLabels.form.rounding")}</FieldLabel>
            <Select
              value={roundingField.value}
              onValueChange={(value) => {
                if (value) roundingField.onChange(value as PriceLabelRoundingMode);
              }}
            >
              <SelectTrigger id="price-label-rounding" className="w-full">
                <SelectValue>{t(`priceLabels.rounding.${roundingField.value}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRICE_LABEL_ROUNDING_MODES.map((rounding) => (
                  <SelectItem key={rounding} value={rounding}>
                    {t(`priceLabels.rounding.${rounding}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-3 md:gap-2">
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
