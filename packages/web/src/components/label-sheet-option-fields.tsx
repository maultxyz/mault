import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LABEL_SHEET_TEMPLATE_IDS } from "@/lib/constants/label-sheets";
import type {
  LabelSheetOptionFieldsProps,
  LabelSheetTemplateId,
} from "@/lib/interfaces/label-sheets";
import { useTranslation } from "react-i18next";

export function LabelSheetOptionFields({
  idPrefix,
  templateId,
  onTemplateIdChange,
  startPositionField,
  startPositionError,
}: LabelSheetOptionFieldsProps) {
  const { t } = useTranslation("common");
  const templateFieldId = `${idPrefix}-template`;
  const startPositionId = `${idPrefix}-start-position`;
  const startPositionHintId = `${startPositionId}-hint`;
  return (
    <>
      <Field>
        <FieldLabel htmlFor={templateFieldId}>{t("labelSheets.template")}</FieldLabel>
        <Select
          value={templateId}
          onValueChange={(value) => {
            if (value) onTemplateIdChange(value as LabelSheetTemplateId);
          }}
        >
          <SelectTrigger id={templateFieldId} className="w-full">
            <SelectValue>{t(`labelSheets.templates.${templateId}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LABEL_SHEET_TEMPLATE_IDS.map((optionTemplateId) => (
              <SelectItem key={optionTemplateId} value={optionTemplateId}>
                {t(`labelSheets.templates.${optionTemplateId}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field data-invalid={startPositionError ? true : undefined}>
        <FieldLabel htmlFor={startPositionId}>{t("labelSheets.startPosition")}</FieldLabel>
        <Input
          id={startPositionId}
          type="number"
          inputMode="numeric"
          min={1}
          name={startPositionField.name}
          ref={startPositionField.ref}
          onBlur={startPositionField.onBlur}
          value={Number.isNaN(startPositionField.value) ? "" : startPositionField.value}
          onChange={(event) => startPositionField.onChange(event.target.valueAsNumber)}
          aria-invalid={!!startPositionError}
          aria-describedby={startPositionHintId}
        />
        <p id={startPositionHintId} className="text-xs text-foreground/70">
          {t("labelSheets.startPositionHint")}
        </p>
        {startPositionError && <FieldError errors={[startPositionError]} />}
      </Field>
    </>
  );
}
