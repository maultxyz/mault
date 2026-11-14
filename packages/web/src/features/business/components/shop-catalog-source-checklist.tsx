import { Checkbox } from "@/components/ui/checkbox";
import type { ShopCatalogSourceChecklistProps } from "@/lib/interfaces/shop-catalogs";
import { useTranslation } from "react-i18next";

export function ShopCatalogSourceChecklist({
  idPrefix,
  label,
  options,
  value,
  onChange,
}: ShopCatalogSourceChecklistProps) {
  const { t } = useTranslation("business");
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-control font-medium">{label}</legend>
      {options.length === 0 ? (
        <p className="text-xs text-foreground/70">{t("shopCatalogs.noSources")}</p>
      ) : (
        <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-xl bg-muted">
          {options.map((option) => {
            const id = `${idPrefix}-${option.guid}`;
            return (
              <div key={option.guid} className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  id={id}
                  checked={value.includes(option.guid)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...value, option.guid]
                        : value.filter((guid) => guid !== option.guid),
                    )
                  }
                />
                <label htmlFor={id} className="min-w-0 truncate text-control">
                  {option.name}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
