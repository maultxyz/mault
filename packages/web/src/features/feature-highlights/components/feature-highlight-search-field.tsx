import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { FeatureHighlightSearchFieldProps } from "@/lib/interfaces/feature-highlights";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function FeatureHighlightSearchField({
  value,
  onValueChange,
}: FeatureHighlightSearchFieldProps) {
  const { t } = useTranslation("common");
  const inputId = useId();
  const label = t("featureHighlights.search.label");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <InputGroup>
        <InputGroupAddon aria-hidden>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          id={inputId}
          type="search"
          value={value}
          placeholder={t("featureHighlights.search.placeholder")}
          onChange={(event) => onValueChange(event.target.value)}
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={t("featureHighlights.search.clear")}
              onClick={() => onValueChange("")}
            >
              <IconX aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
