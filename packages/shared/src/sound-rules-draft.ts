import type { SoundRulesDraftFormValues } from "./interfaces/form-schemas.interface";
import type { SoundRule } from "./interfaces/sounds.interface";

export function toSoundRulesDraft(rules: SoundRule[]): SoundRulesDraftFormValues {
  return {
    order: rules.map((rule) => rule.guid),
    enabled: Object.fromEntries(
      rules.map((rule) => [rule.guid, rule.isEnabled]),
    ),
  };
}

export function orderSoundRules(
  rules: SoundRule[],
  order: string[],
): SoundRule[] {
  const byGuid = new Map(rules.map((rule) => [rule.guid, rule]));
  const ordered = order.flatMap((guid) => byGuid.get(guid) ?? []);
  const placed = new Set(ordered.map((rule) => rule.guid));
  return [...ordered, ...rules.filter((rule) => !placed.has(rule.guid))];
}
