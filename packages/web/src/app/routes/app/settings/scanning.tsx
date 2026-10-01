import { PriceSourceToggle } from "@/components/price-source-toggle";
import { SessionWrappedToggle } from "@/components/session-wrapped-toggle";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { OcrToggle } from "@/features/scanner/components/ocr-toggle";
import { useTranslation } from "react-i18next";

export default function SettingsScanningPage() {
  const { t } = useTranslation("settings");

  return (
    <SettingsSections>
      <SettingsSection
        heading={t("pricing.heading")}
        description={t("pricing.description")}
      >
        <PriceSourceToggle />
      </SettingsSection>
      <SettingsSection
        heading={t("sessionWrapped.heading")}
        description={t("sessionWrapped.description")}
      >
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("sessionWrapped.toggleLabel")}</span>
          <SessionWrappedToggle />
        </label>
      </SettingsSection>
      <SettingsSection
        heading={t("ocr.heading")}
        badge={<Badge variant="outline">{t("ocr.badge")}</Badge>}
        description={t("ocr.description")}
      >
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("ocr.toggleLabel")}</span>
          <OcrToggle />
        </label>
      </SettingsSection>
    </SettingsSections>
  );
}
