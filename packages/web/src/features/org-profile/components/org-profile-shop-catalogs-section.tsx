import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { OrgProfileShopCatalogsSectionProps } from "@/lib/interfaces/org-profile";
import { ORG_PROFILE_SHOP_CATALOGS_MAX } from "@magic-vault/shared";
import { useId } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrgProfileShopCatalogsSection({
  control,
  disabled,
  choices,
}: OrgProfileShopCatalogsSectionProps) {
  const { t } = useTranslation("org-profile");
  const idPrefix = useId();
  if (choices.length === 0) return null;

  return (
    <SettingsSection
      heading={t("shopCatalogs.heading")}
      description={t("shopCatalogs.description", { max: ORG_PROFILE_SHOP_CATALOGS_MAX })}
    >
      <Controller
        control={control}
        name="shopCatalogGuids"
        render={({ field }) => {
          const isFull = field.value.length >= ORG_PROFILE_SHOP_CATALOGS_MAX;
          return (
            <fieldset className="flex flex-col">
              <legend className="sr-only">{t("shopCatalogs.heading")}</legend>
              <div className="divide-y divide-border rounded-lg bg-foreground/6">
                {choices.map((choice) => {
                  const id = `${idPrefix}-${choice.guid}`;
                  const isChecked = field.value.includes(choice.guid);
                  return (
                    <div key={choice.guid} className="flex items-center gap-3 px-3 py-2.5 md:py-2">
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        disabled={disabled || (!isChecked && isFull)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, choice.guid]
                              : field.value.filter((guid) => guid !== choice.guid),
                          )
                        }
                      />
                      <label htmlFor={id} className="min-w-0 flex-1 truncate text-control">
                        {choice.name}
                      </label>
                      {choice.isPublic && (
                        <Badge variant="info">{t("shopCatalogs.publicBadge")}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        }}
      />
    </SettingsSection>
  );
}
