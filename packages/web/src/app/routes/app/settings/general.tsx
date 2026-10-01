import { LanguageSwitcher } from "@/components/language-switcher";
import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { ScannerLayoutToggle } from "@/components/scanner-layout-toggle";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useTranslation } from "react-i18next";

export default function SettingsGeneralPage() {
  const { t } = useTranslation("settings");
  const isMobile = useIsMobile();

  return (
    <SettingsSections>
      <SettingsSection
        heading={t("appearance.heading")}
        description={t("appearance.description")}
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{t("appearance.primaryColor")}</p>
          <PrimaryColorPicker />
        </div>
        {!isMobile && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {t("appearance.scannerLayout")}
            </p>
            <ScannerLayoutToggle />
          </div>
        )}
      </SettingsSection>
      <SettingsSection heading={t("appearance.language")}>
        <LanguageSwitcher />
      </SettingsSection>
    </SettingsSections>
  );
}
