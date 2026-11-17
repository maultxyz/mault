import { Kbd } from "@/components/ui/kbd";
import {
  HOTKEY_APPLE_MOD_LABEL,
  HOTKEY_KEY_LABEL_KEYS,
  HOTKEYS,
} from "@/lib/constants/hotkeys";
import { isApplePlatform } from "@/lib/hotkeys";
import type { HotkeyCombo, HotkeyHintProps } from "@/lib/interfaces/hotkeys";
import { cn } from "@/lib/utils";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

function useComboLabel() {
  const { t } = useTranslation("common");
  return (combo: HotkeyCombo) => {
    const labelKey = HOTKEY_KEY_LABEL_KEYS[combo.key];
    const key = labelKey ? t(labelKey) : combo.key.toUpperCase();
    const withShift = combo.shift ? `${t("hotkeys.keys.shift")} ${key}` : key;
    if (!combo.mod) return withShift;
    const mod = isApplePlatform()
      ? HOTKEY_APPLE_MOD_LABEL
      : t("hotkeys.keys.ctrl");
    return `${mod} ${withShift}`;
  };
}

export function HotkeyHint({ id, className }: HotkeyHintProps) {
  const { t } = useTranslation("common");
  const comboLabel = useComboLabel();
  const { keys } = HOTKEYS[id];

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((combo, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="text-2xs opacity-70">{t("hotkeys.then")}</span>
          )}
          <Kbd>{comboLabel(combo)}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}
