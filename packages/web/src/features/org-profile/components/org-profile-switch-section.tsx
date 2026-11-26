import { SettingsSection } from "@/components/settings-section";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { OrgProfileSwitchSectionProps } from "@/lib/interfaces/org-profile";
import { useId } from "react";
import { Controller } from "react-hook-form";

export function OrgProfileSwitchSection({
  control,
  disabled,
  name,
  heading,
  label,
  description,
}: OrgProfileSwitchSectionProps) {
  const switchId = useId();
  const descriptionId = useId();
  return (
    <SettingsSection heading={heading}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={switchId}>{label}</FieldLabel>
              <FieldDescription id={descriptionId}>{description}</FieldDescription>
            </FieldContent>
            <Switch
              id={switchId}
              aria-describedby={descriptionId}
              checked={field.value}
              disabled={disabled}
              onCheckedChange={field.onChange}
            />
          </Field>
        )}
      />
    </SettingsSection>
  );
}
