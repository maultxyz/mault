import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PickListProgress } from "@/features/bins/components/pick-list-progress";
import type { BinPickListFieldsProps } from "@/lib/interfaces/bins";
import {
  parseDecklist,
  PICK_LIST_MAX_ENTRIES,
  type PickListMode,
} from "@magic-vault/shared";
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
            <ButtonGroup aria-label={t("pickList.modeLabel")}>
              {modeItems.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant={
                    field.value === item.key ? "outline-selected" : "outline"
                  }
                  aria-pressed={field.value === item.key}
                  onClick={() => field.onChange(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </ButtonGroup>
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
              <span className="text-2xs text-foreground/70">
                {t("pickList.cardCount", {
                  count: parsedCount,
                  max: PICK_LIST_MAX_ENTRIES,
                })}
              </span>
            </div>
            <Textarea
              id="bin-pick-list-decklist"
              rows={10}
              className="font-mono"
              placeholder={t("pickList.decklistPlaceholder")}
              {...field}
            />
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
