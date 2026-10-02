import { Kbd } from "@/components/ui/kbd";
import { HOTKEY_KEY_LABEL_KEYS, HOTKEYS } from "@/lib/constants/hotkeys";
import type { HotkeyCombo, HotkeyHintProps } from "@/lib/interfaces/hotkeys";
import { cn } from "@/lib/utils";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

function useComboLabel() {
  const { t } = useTranslation("common");
  return (combo: HotkeyCombo) => {
    const labelKey = HOTKEY_KEY_LABEL_KEYS[combo.key];
    const key = labelKey ? t(labelKey) : combo.key.toUpperCase();
    return combo.shift ? `${t("hotkeys.keys.shift")} ${key}` : key;
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
