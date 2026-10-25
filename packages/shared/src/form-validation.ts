import {
  FORM_VALIDATION_MESSAGE_PREFIX,
  FORM_VALIDATION_VALUE_SEPARATOR,
} from "./constants/form-validation.constant";
import type {
  FormValidationMessageKey,
  ParsedFormValidationMessage,
} from "./interfaces/form-validation.interface";

export function formValidationMessage(
  key: FormValidationMessageKey,
  values: Record<string, number | string> = {},
): string {
  return [
    `${FORM_VALIDATION_MESSAGE_PREFIX}${key}`,
    ...Object.entries(values).map(([name, value]) => `${name}=${value}`),
  ].join(FORM_VALIDATION_VALUE_SEPARATOR);
}

export function parseFormValidationMessage(
  message: string,
): ParsedFormValidationMessage | null {
  if (!message.startsWith(FORM_VALIDATION_MESSAGE_PREFIX)) return null;
  const [translationKey, ...pairs] = message.split(
    FORM_VALIDATION_VALUE_SEPARATOR,
  );
  const values: Record<string, string> = {};
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex > 0) {
      values[pair.slice(0, separatorIndex)] = pair.slice(separatorIndex + 1);
    }
  }
  return { translationKey, values };
}
