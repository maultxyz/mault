import { DEFAULT_OPERATORS_BY_TYPE } from "@/lib/constants/field-operators";
import type { GameFormValues } from "@/schemas/games.schema";
import type {
  FieldMeta,
  FieldRenames,
  Game,
  GameInput,
} from "@magic-vault/shared";

export function toGameFormValues(game?: Game | null): GameFormValues {
  if (!game) {
    return {
      key: "",
      name: "",
      apiDocsUrl: "",
      foilTypesText: "",
      cardThickness: null,
      isActive: true,
      fieldDefinitions: [],
    };
  }
  return {
    key: game.key,
    name: game.name,
    apiDocsUrl: game.apiDocsUrl ?? "",
    foilTypesText: game.foilTypes.join(", "),
    cardThickness: game.cardThickness ?? null,
    isActive: game.isActive,
    fieldDefinitions: game.fieldDefinitions.map((f) => ({
      field: f.field,
      label: f.label,
      type: f.type,
      path: f.path,
      optionsText: f.options?.map((o) => o.value).join(", ") ?? "",
      originalField: f.field,
    })),
  };
}

export function toFoilTypes(foilTypesText: string | undefined): string[] {
  return (
    foilTypesText
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean) ?? []
  );
}

export function toFieldRenames(
  values: GameFormValues["fieldDefinitions"],
): FieldRenames {
  const renames: FieldRenames = {};
  for (const f of values) {
    const field = f.field.trim();
    if (f.originalField && f.originalField !== field) {
      renames[f.originalField] = field;
    }
  }
  return renames;
}

export function toFieldDefinitions(
  values: GameFormValues["fieldDefinitions"],
): FieldMeta[] {
  return values.map((f) => {
    const options = f.optionsText
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));

    return {
      field: f.field.trim(),
      label: f.label.trim(),
      type: f.type,
      path: f.path.trim(),
      operators: DEFAULT_OPERATORS_BY_TYPE[f.type],
      ...(options?.length ? { options } : {}),
    };
  });
}

export function toGameInput(values: GameFormValues): GameInput {
  return {
    key: values.key,
    name: values.name,
    apiDocsUrl: values.apiDocsUrl || null,
    foilTypes: toFoilTypes(values.foilTypesText),
    cardThickness: values.cardThickness,
    isActive: values.isActive,
    fieldDefinitions: toFieldDefinitions(values.fieldDefinitions),
  };
}
