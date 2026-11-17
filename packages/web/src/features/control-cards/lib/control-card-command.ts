import { isCardCondition, type ScannerControlCommand } from "@magic-vault/shared";
import {
  CONTROL_CARD_ANY_SET,
  CONTROL_CARD_NOT_FOIL,
  CONTROL_CARD_UNCHANGED,
} from "@/lib/constants/control-cards";
import type { ControlCardToggleValue } from "@/lib/interfaces/control-cards";
import type { ControlCardFormValues } from "@/schemas/control-cards.schema";

function toToggle(value: ControlCardToggleValue): boolean | undefined {
  if (value === CONTROL_CARD_UNCHANGED) return undefined;
  return value === "on";
}

function toChangedGuid(value: string): string | undefined {
  return value === CONTROL_CARD_UNCHANGED ? undefined : value;
}

function toClearableValue(
  value: string,
  clearValue: string,
): string | null | undefined {
  if (value === CONTROL_CARD_UNCHANGED) return undefined;
  return value === clearValue ? null : value;
}

export function toScannerControlCommand(
  values: ControlCardFormValues,
): ScannerControlCommand {
  return {
    collectionGuid: toChangedGuid(values.collectionGuid),
    presetGuid: toChangedGuid(values.presetGuid),
    forcedFoilType: toClearableValue(values.forcedFoilType, CONTROL_CARD_NOT_FOIL),
    forcedSetCode: toClearableValue(values.forcedSetCode, CONTROL_CARD_ANY_SET),
    condition: isCardCondition(values.condition) ? values.condition : undefined,
    pauseScanner: values.pauseScanner || undefined,
    autoFeed: toToggle(values.autoFeed),
    allowDuplicates: toToggle(values.allowDuplicates),
  };
}
