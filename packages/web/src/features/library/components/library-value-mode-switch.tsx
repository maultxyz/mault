import { SubViewSwitch } from "@/components/sub-view-switch";
import { LIBRARY_VALUE_MODES } from "@/lib/constants/library";
import type { LibraryValueModeSwitchProps } from "@/lib/interfaces/library";
import { useTranslation } from "react-i18next";

export function LibraryValueModeSwitch({ value, onChange }: LibraryValueModeSwitchProps) {
  const { t } = useTranslation("home");
  return (
    <SubViewSwitch
      label={t("library.valueModeLabel")}
      className="border-b-0"
      items={LIBRARY_VALUE_MODES.map((mode) => ({ key: mode, label: t(`library.valueModes.${mode}`) }))}
      value={value}
      onChange={onChange}
    />
  );
}
