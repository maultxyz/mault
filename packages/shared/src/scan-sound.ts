import { evaluateRuleGroup } from "./evaluate-bin";
import type { PlayingCard } from "./interfaces/card.interface";
import type { FieldMeta } from "./interfaces/sort-bins.interface";
import type { SoundRule } from "./interfaces/sounds.interface";

export function selectScanSound(
  card: PlayingCard,
  rules: readonly SoundRule[],
  fields: FieldMeta[],
): string | null {
  return rules.find(
    (rule) => rule.isEnabled && rule.clipGuid && evaluateRuleGroup(card, rule.rules, fields),
  )?.clipGuid ?? null;
}
