import type { ConditionRowProps } from "@/lib/interfaces/bins";
import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  COUNT_OPERATORS,
  ConditionField,
  ConditionOperator,
  FieldMeta,
  isScanRuleField,
} from "@magic-vault/shared";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  CONDITION_FIELD_CLASS,
  CONDITION_INPUT_CLASS,
  CONDITION_SELECT_TRIGGER_CLASS,
  MULTI_VALUE_OPERATORS,
} from "@/lib/constants/bins";
import { cn, sortByLabel } from "@/lib/utils";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function FreeformMultiInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(() => value.join(", "));

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={cn("min-w-24 flex-1", CONDITION_INPUT_CLASS)}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onChange(
          next
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

function getFieldMeta(
  field: ConditionField,
  fieldDefinitions: FieldMeta[],
): FieldMeta | undefined {
  return fieldDefinitions.find((f) => f.field === field);
}

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t } = useTranslation("bins");
  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "min-w-24 flex-1",
        )}
      >
        <span className="truncate flex-1 text-left">
          {selectedLabels.length > 0
            ? selectedLabels.join(", ")
            : t("conditionRow.selectPlaceholder")}
        </span>
        <IconChevronDown className="size-4 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {sortByLabel(options).map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={value.includes(opt.value)}
            onSelect={(e) => e.preventDefault()}
            onClick={() => {
              if (value.includes(opt.value)) {
                onChange(value.filter((v) => v !== opt.value));
              } else {
                onChange([...value, opt.value]);
              }
            }}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConditionRow({
  condition,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const { t } = useTranslation("bins");
  const { ruleFieldDefinitions: fieldDefinitions } = useBinConfigs();
  const { activeCollection } = useCollections();
  const fieldMeta = getFieldMeta(condition.field, fieldDefinitions);
  const sortedFields = useMemo(
    () => sortByLabel(fieldDefinitions),
    [fieldDefinitions],
  );
  const isFreeformOptions =
    !!activeCollection?.lang &&
    activeCollection.lang !== "en" &&
    !isScanRuleField(condition.field, fieldDefinitions);

  const handleFieldChange = useCallback(
    (field: ConditionField) => {
      const newMeta = getFieldMeta(field, fieldDefinitions);
      const defaultOp = newMeta?.operators[0]?.value ?? "equals";
      const defaultValue =
        newMeta?.type === "enum" || newMeta?.type === "set" ? [] : "";
      onChange({
        ...condition,
        field,
        operator: defaultOp,
        value: defaultValue,
      });
    },
    [condition, onChange, fieldDefinitions],
  );

  const handleOperatorChange = useCallback(
    (operator: ConditionOperator) => {
      const isCount = COUNT_OPERATORS.includes(operator);
      if (isCount === COUNT_OPERATORS.includes(condition.operator)) {
        onChange({ ...condition, operator });
        return;
      }
      const isList = fieldMeta?.type === "enum" || fieldMeta?.type === "set";
      onChange({
        ...condition,
        operator,
        value: !isCount && isList ? [] : "",
      });
    },
    [condition, onChange, fieldMeta],
  );

  const handleValueChange = useCallback(
    (value: string | number | string[]) => {
      onChange({ ...condition, value });
    },
    [condition, onChange],
  );

  const renderValueInput = () => {
    if (!fieldMeta) return null;

    if (condition.operator === "is_null" || condition.operator === "is_not_null") {
      return null;
    }

    if (COUNT_OPERATORS.includes(condition.operator)) {
      return (
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="0"
          className={cn("min-w-24 flex-1", CONDITION_INPUT_CLASS)}
          value={condition.value === "" ? "" : String(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            handleValueChange(raw === "" ? "" : Number(raw));
          }}
        />
      );
    }

    const isMulti =
      MULTI_VALUE_OPERATORS.includes(condition.operator) ||
      (fieldMeta.type === "set" &&
        (condition.operator === "equals" ||
          condition.operator === "not_equals"));
    const isOptionsField =
      (fieldMeta.type === "enum" || fieldMeta.type === "set") &&
      !!fieldMeta.options;

    if (isOptionsField && isFreeformOptions && isMulti) {
      const arrValue = Array.isArray(condition.value) ? condition.value : [];
      return (
        <FreeformMultiInput
          key={`${condition.field}:${condition.operator}`}
          value={arrValue}
          onChange={handleValueChange}
          placeholder={t("conditionRow.freeformMultiPlaceholder")}
        />
      );
    }

    if (isOptionsField && !isFreeformOptions) {
      if (isMulti) {
        const arrValue = Array.isArray(condition.value) ? condition.value : [];
        return (
          <MultiSelect
            options={fieldMeta.options!}
            value={arrValue}
            onChange={handleValueChange}
          />
        );
      }

      return (
        <Select
          value={String(condition.value)}
          onValueChange={(val) => handleValueChange(val as string)}
        >
          <SelectTrigger
            className={cn("min-w-24 flex-1", CONDITION_SELECT_TRIGGER_CLASS)}
          >
            <SelectValue placeholder={t("conditionRow.selectPlaceholder")}>
              {
                fieldMeta.options!.find(
                  (opt) => opt.value === String(condition.value),
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortByLabel(fieldMeta.options!).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldMeta.type === "numeric") {
      return (
        <Input
          type="number"
          step="any"
          placeholder="0"
          max={CONDITION_NUMERIC_MAX}
          className={cn("min-w-24 flex-1", CONDITION_INPUT_CLASS)}
          value={condition.value === "" ? "" : String(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            handleValueChange(raw === "" ? "" : Number(raw));
          }}
        />
      );
    }

    return (
      <Input
        type="text"
        placeholder={t("conditionRow.valuePlaceholder")}
        maxLength={CONDITION_STRING_MAX_LENGTH}
        className={cn("min-w-24 flex-1", CONDITION_INPUT_CLASS)}
        value={String(condition.value)}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    );
  };

  return (
    <div
      className="flex flex-wrap items-start gap-1.5 max-md:rounded-lg max-md:bg-card max-md:p-2 max-md:ring-1 max-md:ring-border"
      data-tour="condition-row"
    >
      <Combobox
        items={sortedFields}
        value={fieldMeta ?? null}
        onValueChange={(meta: FieldMeta | null) => {
          if (meta) handleFieldChange(meta.field);
        }}
        itemToStringLabel={(meta: FieldMeta) => meta.label}
        isItemEqualToValue={(a: FieldMeta, b: FieldMeta) =>
          a?.field === b?.field
        }
      >
        <ComboboxInput
          className={cn("min-w-28", CONDITION_FIELD_CLASS)}
          placeholder={t("conditionRow.selectPlaceholder")}
        />
        <ComboboxContent>
          <ComboboxEmpty>{t("conditionRow.noFields")}</ComboboxEmpty>
          <ComboboxList>
            {(meta: FieldMeta) => (
              <ComboboxItem key={meta.field} value={meta}>
                <span className="truncate">{meta.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {fieldMeta && (
        <Select
          value={condition.operator}
          onValueChange={(val) =>
            handleOperatorChange(val as ConditionOperator)
          }
        >
          <SelectTrigger
            className={cn("min-w-28", CONDITION_SELECT_TRIGGER_CLASS)}
          >
            <SelectValue>
              {
                fieldMeta.operators.find(
                  (op) => op.value === condition.operator,
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {fieldMeta.operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {renderValueInput()}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
      >
        <IconX />
      </Button>
    </div>
  );
}
