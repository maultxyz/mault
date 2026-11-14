import { ViewTabs } from "@/components/view-tabs";
import { LIBRARY_VALUE_MODES } from "@/lib/constants/library";
import type { LibraryValueModeTabsProps } from "@/lib/interfaces/library";
import { useTranslation } from "react-i18next";

export function LibraryValueModeTabs({ value, onChange }: LibraryValueModeTabsProps) {
  const { t } = useTranslation("home");
  return (
    <ViewTabs
      label={t("library.valueModeLabel")}
      className="border-b-0"
      items={LIBRARY_VALUE_MODES.map((mode) => ({ key: mode, label: t(`library.valueModes.${mode}`) }))}
      value={value}
      onChange={onChange}
    />
  );
}
