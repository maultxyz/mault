import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  ControlCardSelectField,
  ControlCardSetField,
} from "@/features/control-cards/components/control-card-fields";
import { toScannerControlCommand } from "@/features/control-cards/lib/control-card-command";
import { describeScannerControlCommand } from "@/features/control-cards/lib/describe-control-command";
import {
  CONTROL_CARD_ANY_SET,
  CONTROL_CARDS_COLLECTION_PARAM,
  CONTROL_CARDS_PRESET_PARAM,
  CONTROL_CARD_DEFAULT_VALUES,
  CONTROL_CARD_NOT_FOIL,
  CONTROL_CARD_QR_OPTIONS,
  CONTROL_CARD_TOGGLE_VALUES,
  CONTROL_CARD_UNCHANGED,
} from "@/lib/constants/control-cards";
import type {
  ControlCardBuilderProps,
  ControlCardOption,
} from "@/lib/interfaces/control-cards";
import {
  controlCardSchema,
  type ControlCardFormValues,
} from "@/schemas/control-cards.schema";
import {
  CARD_CONDITIONS,
  encodeScannerControlCode,
  formValidationMessage,
  hasScannerControlChanges,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function ControlCardBuilder({ onAdd }: ControlCardBuilderProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const { data: collections = [], isSuccess: collectionsLoaded } = useQuery(
    collectionsQueryOptions,
  );
  const { data: presets = [], isSuccess: presetsLoaded } =
    useQuery(binsQueryOptions);
  const form = useForm<ControlCardFormValues>({
    resolver: zodResolver(controlCardSchema),
    defaultValues: CONTROL_CARD_DEFAULT_VALUES,
  });
  const [searchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefillCollectionGuid = searchParams.get(CONTROL_CARDS_COLLECTION_PARAM);
    const prefillPresetGuid = searchParams.get(CONTROL_CARDS_PRESET_PARAM);
    if (!prefillCollectionGuid && !prefillPresetGuid) {
      prefillAppliedRef.current = true;
      return;
    }
    if (!collectionsLoaded || !presetsLoaded) return;
    prefillAppliedRef.current = true;
    const prefillCollection = collections.find(
      (collection) => collection.guid === prefillCollectionGuid,
    );
    const prefillPreset = presets.find(
      (preset) => preset.guid === prefillPresetGuid,
    );
    form.reset({
      ...CONTROL_CARD_DEFAULT_VALUES,
      title: prefillCollection?.name ?? prefillPreset?.name ?? "",
      collectionGuid: prefillCollection?.guid ?? CONTROL_CARD_UNCHANGED,
      presetGuid: prefillPreset?.guid ?? CONTROL_CARD_UNCHANGED,
    });
  }, [collections, collectionsLoaded, presets, presetsLoaded, searchParams, form]);
  const collectionGuid = useWatch({
    control: form.control,
    name: "collectionGuid",
  });
  const targetCollection =
    collections.find((collection) => collection.guid === collectionGuid) ??
    collections.find((collection) => collection.isActive) ??
    null;
  const targetGameGuid = targetCollection?.game?.guid ?? null;
  const { data: cardSets = [] } = useQuery(
    cardSetsQueryOptions(targetCollection?.guid),
  );

  const unchangedOption: ControlCardOption = {
    value: CONTROL_CARD_UNCHANGED,
    label: t("controlCards.form.unchanged"),
  };
  const collectionOptions = [
    unchangedOption,
    ...collections.map((collection) => ({
      value: collection.guid,
      label: collection.name,
    })),
  ];
  const presetOptions = [
    unchangedOption,
    ...presets
      .filter((preset) => (preset.game?.guid ?? null) === targetGameGuid)
      .map((preset) => ({ value: preset.guid, label: preset.name })),
  ];
  const gameFoilTypes = targetCollection?.game?.foilTypes;
  const foilTypes = gameFoilTypes?.length ? gameFoilTypes : [tCards("foil")];
  const foilOptions = [
    unchangedOption,
    { value: CONTROL_CARD_NOT_FOIL, label: tCards("foilNone") },
    ...foilTypes.map((foilType) => ({ value: foilType, label: foilType })),
  ];
  const setOptions = [
    unchangedOption,
    { value: CONTROL_CARD_ANY_SET, label: t("scannerControls.anySet") },
    ...cardSets.map((cardSet) => ({
      value: cardSet.code,
      label: `${cardSet.name} (${cardSet.code.toUpperCase()})`,
    })),
  ];
  const conditionOptions = [
    unchangedOption,
    ...CARD_CONDITIONS.map((condition) => ({
      value: condition,
      label: tCards(`condition.names.${condition}`),
    })),
  ];
  const toggleOptions = CONTROL_CARD_TOGGLE_VALUES.map((value) => ({
    value,
    label: t(`controlCards.form.toggle.${value}`),
  }));

  const resetGameScopedFields = () => {
    form.setValue("presetGuid", CONTROL_CARD_UNCHANGED);
    form.setValue("forcedFoilType", CONTROL_CARD_UNCHANGED);
    form.setValue("forcedSetCode", CONTROL_CARD_UNCHANGED);
  };

  const submit = async (values: ControlCardFormValues) => {
    const command = toScannerControlCommand(values);
    if (!hasScannerControlChanges(command)) {
      form.setError("root", {
        message: formValidationMessage("controlCardActionRequired"),
      });
      return;
    }
    const qrCodeDataUrl = await QRCode.toDataURL(
      encodeScannerControlCode(command),
      CONTROL_CARD_QR_OPTIONS,
    );
    onAdd({
      id: crypto.randomUUID(),
      title: values.title,
      actionLines: describeScannerControlCommand(
        command,
        {
          collectionName: (guid) =>
            collections.find((collection) => collection.guid === guid)
              ?.name ?? guid,
          presetName: (guid) =>
            presets.find((preset) => preset.guid === guid)?.name ?? guid,
          setName: (setCode) =>
            cardSets.find((cardSet) => cardSet.code === setCode)?.name ??
            setCode.toUpperCase(),
          conditionName: (condition) =>
            tCards(`condition.names.${condition}`),
        },
        t,
      ),
      qrCodeDataUrl,
    });
    form.reset(CONTROL_CARD_DEFAULT_VALUES);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("controlCards.form.title")}</CardTitle>
        <CardDescription>{t("controlCards.form.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="control-card-title">
                  {t("controlCards.form.cardTitle")}
                </FieldLabel>
                <Input
                  {...field}
                  id="control-card-title"
                  placeholder={t("controlCards.form.cardTitlePlaceholder")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ControlCardSelectField
              control={form.control}
              name="collectionGuid"
              label={t("controlCards.form.collection")}
              options={collectionOptions}
              onValueChange={resetGameScopedFields}
            />
            <ControlCardSelectField
              control={form.control}
              name="presetGuid"
              label={t("controlCards.form.preset")}
              options={presetOptions}
            />
            <ControlCardSelectField
              control={form.control}
              name="forcedFoilType"
              label={t("controlCards.form.foil")}
              options={foilOptions}
            />
            <ControlCardSetField
              control={form.control}
              label={t("controlCards.form.set")}
              options={setOptions}
            />
            <ControlCardSelectField
              control={form.control}
              name="condition"
              label={t("controlCards.form.condition")}
              options={conditionOptions}
            />
            <ControlCardSelectField
              control={form.control}
              name="autoFeed"
              label={t("controlCards.form.autoFeed")}
              options={toggleOptions}
            />
            <ControlCardSelectField
              control={form.control}
              name="allowDuplicates"
              label={t("controlCards.form.allowDuplicates")}
              options={toggleOptions}
            />
            <Controller
              name="pauseScanner"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal" className="self-end">
                  <Switch
                    id="control-card-pauseScanner"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="control-card-pauseScanner">
                    {t("controlCards.form.pauseScanner")}
                  </FieldLabel>
                </Field>
              )}
            />
          </div>
          {form.formState.errors.root && (
            <FieldError errors={[form.formState.errors.root]} />
          )}
          <Button
            type="submit"
            className="self-start"
            disabled={form.formState.isSubmitting}
          >
            <IconPlus />
            {t("controlCards.form.add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
