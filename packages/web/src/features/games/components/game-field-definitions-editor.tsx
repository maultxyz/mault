import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FIELD_TYPES } from "../constants/field-operators";
import { uniqueFieldKey, type PickedField } from "../lib/field-mapping";
import type { GameFormValues } from "./game-form-dialog";
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

  const fieldTypeOptions = FIELD_TYPES.map((value) => ({
    value,
    label: t(`fieldTypes.${value}`),
  }));

  function handlePick(picked: PickedField) {
    append({
      field: uniqueFieldKey(
        picked.field,
        fields.map((f) => f.field),
      ),
      label: picked.label,
      type: picked.type,
      path: picked.path,
      optionsText: "",
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
      <SampleCardBrowser gameKey={gameKey ?? ""} onPick={handlePick} />

      <div className="flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {t("fieldDefinitionsEditor.heading")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
            <IconPlus size={14} />
            {t("fieldDefinitionsEditor.addField")}
          </Button>
        </div>

        {errors.fieldDefinitions?.root?.message && (
          <p className="text-sm text-destructive">
            {errors.fieldDefinitions.root.message}
          </p>
        )}

        <div className="overflow-y-auto">
          <div className="flex flex-col gap-3 pr-3">
            {fields.map((row, index) => (
              <div
                key={row.id}
                className="rounded-lg border p-3 flex flex-col gap-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    data-invalid={!!errors.fieldDefinitions?.[index]?.field}
                  >
                    <Input
                      placeholder={t(
                        "fieldDefinitionsEditor.fieldKeyPlaceholder",
                      )}
                      {...register(`fieldDefinitions.${index}.field`)}
                    />
                    <FieldError
                      errors={[errors.fieldDefinitions?.[index]?.field]}
                    />
                  </Field>
                  <Field
                    data-invalid={!!errors.fieldDefinitions?.[index]?.label}
                  >
                    <Input
                      placeholder={t("fieldDefinitionsEditor.labelPlaceholder")}
                      {...register(`fieldDefinitions.${index}.label`)}
                    />
                    <FieldError
                      errors={[errors.fieldDefinitions?.[index]?.label]}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    control={control}
                    name={`fieldDefinitions.${index}.type`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
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
                  <Field
                    data-invalid={!!errors.fieldDefinitions?.[index]?.path}
                  >
                    <Input
                      placeholder={t(
                        "fieldDefinitionsEditor.dataPathPlaceholder",
                      )}
                      {...register(`fieldDefinitions.${index}.path`)}
                    />
                    <FieldError
                      errors={[errors.fieldDefinitions?.[index]?.path]}
                    />
                  </Field>
                </div>
                <Controller
                  control={control}
                  name={`fieldDefinitions.${index}.type`}
                  render={({ field: typeField }) =>
                    typeField.value === "enum" || typeField.value === "set" ? (
                      <Input
                        placeholder={t(
                          "fieldDefinitionsEditor.optionsPlaceholder",
                        )}
                        {...register(`fieldDefinitions.${index}.optionsText`)}
                      />
                    ) : (
                      <></>
                    )
                  }
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("fieldDefinitionsEditor.empty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
