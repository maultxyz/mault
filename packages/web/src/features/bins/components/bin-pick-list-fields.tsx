import { CardListFileButton } from "@/components/card-list-file-button";
import { Callout } from "@/components/callout";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PickListProgress } from "@/features/bins/components/pick-list-progress";
import { pickListImportFromCardList } from "@/features/bins/lib/pick-list-import";
import type {
  BinPickListFieldsProps,
  PickListImport,
} from "@/lib/interfaces/bins";
import {
  parseDecklist,
  PICK_LIST_MAX_ENTRIES,
  type PickListMode,
} from "@magic-vault/shared";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function BinPickListFields({
  control,
  binGuid,
  savedPickList,
}: BinPickListFieldsProps) {
  const { t } = useTranslation("bins");
  const pickList = useWatch({ control, name: "pickList" });
  const parsedCount = parseDecklist(pickList?.decklist ?? "").length;
  const [lastImport, setLastImport] = useState<PickListImport | null>(null);

  const modeItems: { key: PickListMode; label: string }[] = [
    { key: "until_found", label: t("pickList.modes.untilFound") },
    { key: "all", label: t("pickList.modes.all") },
  ];

  return (
    <>
      <Controller
        name="pickList.mode"
        control={control}
        render={({ field }) => (
          <Field className="mb-6 max-w-md gap-1.5">
            <FieldLabel>{t("pickList.modeLabel")}</FieldLabel>
            <ResponsiveSegmented
              items={modeItems}
              value={field.value}
              onChange={field.onChange}
              label={t("pickList.modeLabel")}
            />
            <FieldDescription>
              {field.value === "all"
                ? t("pickList.modes.allDescription")
                : t("pickList.modes.untilFoundDescription")}
            </FieldDescription>
          </Field>
        )}
      />
      <Controller
        name="pickList.decklist"
        control={control}
        render={({ field, fieldState }) => (
          <Field className="mb-6 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="bin-pick-list-decklist">
                {t("pickList.decklistLabel")}
              </FieldLabel>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground/70">
                  {t("pickList.cardCount", {
                    count: parsedCount,
                    max: PICK_LIST_MAX_ENTRIES,
                  })}
                </span>
                <CardListFileButton
                  onFileRead={({ text }) => {
                    const imported = pickListImportFromCardList(text);
                    setLastImport(imported);
                    if (imported.entryCount > 0) {
                      field.onChange(imported.decklist);
                    }
                  }}
                />
              </div>
            </div>
            <Textarea
              id="bin-pick-list-decklist"
              rows={10}
              className="font-mono"
              placeholder={t("pickList.decklistPlaceholder")}
              {...field}
              onChange={(event) => {
                setLastImport(null);
                field.onChange(event);
              }}
            />
            {lastImport &&
              (lastImport.entryCount === 0 || lastImport.skippedRows > 0) && (
                <Callout variant="warning">
                  {lastImport.entryCount === 0
                    ? t("pickList.importEmpty")
                    : t("pickList.importSkipped", {
                        count: lastImport.skippedRows,
                      })}
                </Callout>
              )}
            <FieldDescription>{t("pickList.decklistHint")}</FieldDescription>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {binGuid && savedPickList && savedPickList.entries.length > 0 && (
        <Field className="mb-6 gap-1.5">
          <FieldLabel>{t("pickList.progressLabel")}</FieldLabel>
          <PickListProgress
            binGuid={binGuid}
            pickList={savedPickList}
            canAdjust
          />
        </Field>
      )}
    </>
  );
}
