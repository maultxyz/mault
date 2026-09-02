import type { ConditionRowProps } from "@/features/bins/types";
import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  ConditionField,
  ConditionOperator,
  FieldMeta,
} from "@magic-vault/shared";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

const MULTI_VALUE_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];

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
      className="min-w-24 flex-1"
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
        {options.map((opt) => (
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
  const { fieldDefinitions } = useBinConfigs();
  const { activeCollection } = useCollections();
  const fieldMeta = getFieldMeta(condition.field, fieldDefinitions);
  const isFreeformOptions =
    !!activeCollection?.lang && activeCollection.lang !== "en";

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
      onChange({ ...condition, operator });
    },
    [condition, onChange],
  );

  const handleValueChange = useCallback(
    (value: string | number | string[]) => {
      onChange({ ...condition, value });
    },
    [condition, onChange],
  );

  const renderValueInput = () => {
    if (!fieldMeta) return null;

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
          <SelectTrigger className="min-w-24 flex-1">
            <SelectValue placeholder={t("conditionRow.selectPlaceholder")}>
              {
                fieldMeta.options!.find(
                  (opt) => opt.value === String(condition.value),
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {fieldMeta.options!.map((opt) => (
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
          className="min-w-24 flex-1"
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
        className="min-w-24 flex-1"
        value={String(condition.value)}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-1.5">
      <Select
        value={condition.field}
        onValueChange={(val) => handleFieldChange(val as ConditionField)}
      >
        <SelectTrigger className="min-w-28">
          <SelectValue>{fieldMeta?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fieldDefinitions.map((f) => (
            <SelectItem key={f.field} value={f.field}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {fieldMeta && (
        <Select
          value={condition.operator}
          onValueChange={(val) =>
            handleOperatorChange(val as ConditionOperator)
          }
        >
          <SelectTrigger className="min-w-28">
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
