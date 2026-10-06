import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FIELD_TYPES } from "@/lib/constants/field-operators";
import type { PickedField } from "@/lib/interfaces/games";
import type { GameFormValues } from "@/schemas/games.schema";
import {
  IconListDetails,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { uniqueFieldKey } from "../lib/field-mapping";
import { SampleCardBrowser } from "./sample-card-browser";

export function GameFieldDefinitionsEditor() {
  const { t } = useTranslation("games");
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<GameFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "fieldDefinitions",
  });
  const gameKey = useWatch({ control, name: "key" });
  const rows = useWatch({ control, name: "fieldDefinitions" });
  const [showSample, setShowSample] = useState(false);

  const fieldTypeOptions = FIELD_TYPES.map((value) => ({
    value,
    label: t(`fieldTypes.${value}`),
  }));
  const listError =
    errors.fieldDefinitions?.root?.message ?? errors.fieldDefinitions?.message;

  function handlePick(picked: PickedField) {
    append(
      {
        field: uniqueFieldKey(
          picked.field,
          (rows ?? []).map((f) => f.field),
        ),
        label: picked.label,
        type: picked.type,
        path: picked.path,
        optionsText: "",
      },
      { shouldFocus: false },
    );
  }

  function hasOptions(index: number) {
    const type = rows?.[index]?.type;
    return type === "enum" || type === "set";
  }

  return (
    <SettingsSection
      heading={t("fieldDefinitionsEditor.heading")}
      description={t("fieldDefinitionsEditor.description")}
      action={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSample((s) => !s)}
            disabled={!gameKey}
          >
            {showSample ? <IconX /> : <IconSearch />}
            {showSample
              ? t("fieldDefinitionsEditor.hideSample")
              : t("fieldDefinitionsEditor.pickFromSample")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                field: "",
                label: "",
                type: "string",
                path: "",
                optionsText: "",
              })
            }
          >
            <IconPlus />
            {t("fieldDefinitionsEditor.addField")}
          </Button>
        </>
      }
    >
      {listError && <Callout variant="error">{listError}</Callout>}

      {showSample && gameKey && (
        <div className="flex max-h-96 flex-col overflow-hidden rounded-lg border p-3">
          <SampleCardBrowser gameKey={gameKey} onPick={handlePick} />
        </div>
      )}

      {fields.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconListDetails}
          title={t("fieldDefinitionsEditor.empty")}
        />
      ) : (
        <div className="rounded-lg border">
          <Table className="min-w-3xl text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">
                  {t("fieldDefinitionsEditor.columns.key")}
                </TableHead>
                <TableHead className="w-40">
                  {t("fieldDefinitionsEditor.columns.label")}
                </TableHead>
                <TableHead className="w-28">
                  {t("fieldDefinitionsEditor.columns.type")}
                </TableHead>
                <TableHead>{t("fieldDefinitionsEditor.columns.path")}</TableHead>
                <TableHead className="w-40">
                  {t("fieldDefinitionsEditor.columns.options")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((row, index) => {
                const rowErrors = errors.fieldDefinitions?.[index];
                return (
                  <TableRow key={row.id} className="align-top">
                    <TableCell>
                      <Input
                        aria-label={t("fieldDefinitionsEditor.columns.key")}
                        aria-invalid={!!rowErrors?.field}
                        placeholder={t(
                          "fieldDefinitionsEditor.fieldKeyPlaceholder",
                        )}
                        className="font-mono"
                        {...register(`fieldDefinitions.${index}.field`)}
                      />
                      <FieldError errors={[rowErrors?.field]} />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={t("fieldDefinitionsEditor.columns.label")}
                        aria-invalid={!!rowErrors?.label}
                        placeholder={t("fieldDefinitionsEditor.labelPlaceholder")}
                        {...register(`fieldDefinitions.${index}.label`)}
                      />
                      <FieldError errors={[rowErrors?.label]} />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`fieldDefinitions.${index}.type`}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label={t(
                                "fieldDefinitionsEditor.columns.type",
                              )}
                            >
                              <SelectValue>
                                {
                                  fieldTypeOptions.find(
                                    (opt) => opt.value === field.value,
                                  )?.label
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={t("fieldDefinitionsEditor.columns.path")}
                        aria-invalid={!!rowErrors?.path}
                        placeholder={t(
                          "fieldDefinitionsEditor.dataPathPlaceholder",
                        )}
                        className="font-mono"
                        {...register(`fieldDefinitions.${index}.path`)}
                      />
                      <FieldError errors={[rowErrors?.path]} />
                    </TableCell>
                    <TableCell>
                      {hasOptions(index) && (
                        <Input
                          aria-label={t(
                            "fieldDefinitionsEditor.columns.options",
                          )}
                          placeholder={t(
                            "fieldDefinitionsEditor.optionsPlaceholder",
                          )}
                          {...register(`fieldDefinitions.${index}.optionsText`)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        title={t("fieldDefinitionsEditor.removeField")}
                        aria-label={t("fieldDefinitionsEditor.removeField")}
                      >
                        <IconTrash />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
