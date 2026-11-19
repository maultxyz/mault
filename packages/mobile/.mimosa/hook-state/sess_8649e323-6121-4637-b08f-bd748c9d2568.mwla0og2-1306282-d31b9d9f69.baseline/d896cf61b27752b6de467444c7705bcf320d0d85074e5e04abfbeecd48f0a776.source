import { DEFAULT_OPERATORS_BY_FIELD_TYPE, GAME_FIELD_TYPES, GAME_KEY_PATTERN } from "@magic-vault/shared";
import { z } from "zod";
import type { FieldMeta, FieldRenames, Game, GameInput } from "@magic-vault/shared";
import {
  GAME_EDITOR_VALIDATION_KEYS,
} from "@/lib/constants/admin-cards";
import type { GameEditorFormValues, GameFieldDefinitionDraft } from "@/lib/interfaces/admin-cards";

const gameFieldDefinitionSchema = z.object({
  field: z.string().trim().min(1, GAME_EDITOR_VALIDATION_KEYS.required),
  label: z.string().trim().min(1, GAME_EDITOR_VALIDATION_KEYS.required),
  type: z.enum(GAME_FIELD_TYPES as ["string", "numeric", "enum", "set"]),
  path: z.string().trim().min(1, GAME_EDITOR_VALIDATION_KEYS.required),
  optionsText: z.string(),
  originalField: z.string().optional(),
});

export const gameEditorFormSchema = z.object({
  key: z.string().min(1, GAME_EDITOR_VALIDATION_KEYS.required).regex(GAME_KEY_PATTERN, GAME_EDITOR_VALIDATION_KEYS.keyFormat),
  name: z.string().trim().min(1, GAME_EDITOR_VALIDATION_KEYS.required),
  apiDocsUrl: z.string().trim().url(GAME_EDITOR_VALIDATION_KEYS.urlFormat).or(z.literal("")),
  cardThicknessText: z
    .string()
    .trim()
    .refine((text) => text === "" || (Number.isFinite(Number(text)) && Number(text) > 0), GAME_EDITOR_VALIDATION_KEYS.thicknessPositive),
  isActive: z.boolean(),
  fieldDefinitions: z.array(gameFieldDefinitionSchema).min(1, GAME_EDITOR_VALIDATION_KEYS.minFields),
}) satisfies z.ZodType<GameEditorFormValues>;

export function toGameEditorFormValues(game: Game | null): GameEditorFormValues {
  if (!game) {
    return { key: "", name: "", apiDocsUrl: "", cardThicknessText: "", isActive: true, fieldDefinitions: [] };
  }
  return {
    key: game.key,
    name: game.name,
    apiDocsUrl: game.apiDocsUrl ?? "",
    cardThicknessText: game.cardThickness != null ? String(game.cardThickness) : "",
    isActive: game.isActive,
    fieldDefinitions: game.fieldDefinitions.map((definition) => ({
      field: definition.field,
      label: definition.label,
      type: definition.type,
      path: definition.path,
      optionsText: definition.options?.map((option) => option.value).join(", ") ?? "",
      originalField: definition.field,
    })),
  };
}

export function emptyGameFieldDefinition(): GameFieldDefinitionDraft {
  return { field: "", label: "", type: "string", path: "", optionsText: "" };
}

export function toFieldRenames(definitions: GameFieldDefinitionDraft[]): FieldRenames {
  const renames: FieldRenames = {};
  for (const definition of definitions) {
    const field = definition.field.trim();
    if (definition.originalField && definition.originalField !== field) renames[definition.originalField] = field;
  }
  return renames;
}

function toFieldDefinitions(definitions: GameFieldDefinitionDraft[]): FieldMeta[] {
  return definitions.map((definition) => {
    const options = definition.optionsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
    return {
      field: definition.field.trim(),
      label: definition.label.trim(),
      type: definition.type,
      path: definition.path.trim(),
      operators: DEFAULT_OPERATORS_BY_FIELD_TYPE[definition.type],
      ...(options.length ? { options } : {}),
    };
  });
}

export function toGameInput(values: GameEditorFormValues): GameInput {
  const cardThickness = values.cardThicknessText.trim();
  return {
    key: values.key,
    name: values.name.trim(),
    apiDocsUrl: values.apiDocsUrl.trim() || null,
    cardThickness: cardThickness ? Number(cardThickness) : null,
    isActive: values.isActive,
    fieldDefinitions: toFieldDefinitions(values.fieldDefinitions),
  };
}
