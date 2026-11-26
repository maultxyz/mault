import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ORG_PROFILE_SHOP_CATALOGS_MAX } from "@magic-vault/shared";
import { SwitchRow } from "@/components/ui/switch-row";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { OrgProfileShopCatalogsSectionProps } from "@/lib/interfaces/org-profile";

export function OrgProfileShopCatalogsSection({ control, disabled, choices }: OrgProfileShopCatalogsSectionProps) {
  const { t } = useTranslation();
  if (choices.length === 0) return null;
  return (
    <SettingsSection
      title={t("settings.orgProfile.shopCatalogs.heading")}
      description={t("settings.orgProfile.shopCatalogs.description", { max: ORG_PROFILE_SHOP_CATALOGS_MAX })}
    >
      <Controller
        control={control}
        name="shopCatalogGuids"
        render={({ field }) => (
          <>
            {choices.map((catalog) => {
              const isOn = field.value.includes(catalog.guid);
              return (
                <SwitchRow
                  key={catalog.guid}
                  title={catalog.name}
                  description={
                    catalog.isPublic
                      ? t("settings.orgProfile.shopCatalogs.publicCatalog")
                      : t("settings.orgProfile.shopCatalogs.privateCatalog")
                  }
                  value={isOn}
                  disabled={disabled || (!isOn && field.value.length >= ORG_PROFILE_SHOP_CATALOGS_MAX)}
                  onValueChange={(on) =>
                    field.onChange(on ? [...field.value, catalog.guid] : field.value.filter((guid) => guid !== catalog.guid))
                  }
                />
              );
            })}
          </>
        )}
      />
    </SettingsSection>
  );
}
