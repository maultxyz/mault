export const FORM_VALIDATION_MESSAGE_PREFIX = "validation.";
export const FORM_VALIDATION_VALUE_SEPARATOR = "|";

export const FORM_VALIDATION_MESSAGE_KEYS = [
  "nameRequired",
  "nameTooLong",
  "ruleNameRequired",
  "clipNameRequired",
  "gameRequired",
  "languageRequired",
  "collectionRequired",
  "channelRequired",
  "clipRequired",
  "conditionsRequired",
  "emailInvalid",
  "currentPasswordRequired",
  "passwordTooShort",
  "passwordMismatch",
  "webhookUrlInvalid",
  "eventsRequired",
  "permissionsRequired",
  "conditionMultipliersInvalid",
  "valueRequired",
  "wholeNumber",
  "atLeast",
  "atMost",
  "percentAtLeast",
  "percentAtMost",
  "amountRequired",
  "percentageRequired",
  "tiersRequired",
  "tooManyTiers",
  "customerNameRequired",
  "orderTextRequired",
  "cardCountRequired",
  "storageLocationRequired",
  "commandRequired",
  "verificationCodeLength",
  "verificationCodeNumeric",
  "controlCardActionRequired",
] as const;

export const ORGANIZATION_NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const WEBHOOK_FORM_URL_PATTERN = /^https:\/\/\S+$/;
