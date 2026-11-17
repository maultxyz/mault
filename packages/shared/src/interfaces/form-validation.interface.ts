import type { FORM_VALIDATION_MESSAGE_KEYS } from "../constants/form-validation.constant";

export type FormValidationMessageKey =
  (typeof FORM_VALIDATION_MESSAGE_KEYS)[number];

export interface ParsedFormValidationMessage {
  translationKey: string;
  values: Record<string, string>;
}
