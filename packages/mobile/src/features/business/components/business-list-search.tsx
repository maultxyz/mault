import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/ui/search-input";
import type { BusinessListSearchProps } from "@/lib/interfaces/business";

export function BusinessListSearch({ value, onChange, placeholder }: BusinessListSearchProps) {
  const { t } = useTranslation();
  return (
    <SearchInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      onClear={() => onChange("")}
      clearAccessibilityLabel={t("business.search.clear")}
    />
  );
}
