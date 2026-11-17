import type { FeederTestFormValues } from "../interfaces/form-schemas.interface";

export const FEEDER_TEST_DEFAULT_CARD_COUNT = 10;
export const FEEDER_TEST_MIN_CARD_COUNT = 1;
export const FEEDER_TEST_MAX_CARD_COUNT = 1000;
export const FEEDER_TEST_RESPONSE_TIMEOUT_MS = 10_000;

export const FEEDER_TEST_DEFAULT_FORM_VALUES: FeederTestFormValues = {
  runUntilStopped: false,
  cardsToSend: FEEDER_TEST_DEFAULT_CARD_COUNT,
};
