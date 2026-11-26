import { SettingsSection } from "@/components/settings-section";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OrgProfileEditorSectionProps } from "@/lib/interfaces/org-profile";
import {
  ORG_PROFILE_BIO_MAX_LENGTH,
  ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrgProfileDetailsSection({ form, control, disabled }: OrgProfileEditorSectionProps) {
  const { t } = useTranslation("org-profile");
  const displayNameId = useId();
  const bioId = useId();
  const bioCounterId = useId();
  const bio = useWatch({ control, name: "bio" }) ?? "";
  const { errors } = form.formState;

  return (
    <SettingsSection heading={t("details.heading")} description={t("details.description")}>
      <Field data-invalid={!!errors.displayName}>
        <FieldLabel htmlFor={displayNameId}>{t("details.displayNameLabel")}</FieldLabel>
        <Input
          id={displayNameId}
          maxLength={ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH}
          aria-invalid={!!errors.displayName}
          disabled={disabled}
          {...form.register("displayName")}
        />
        <FieldError errors={[errors.displayName]} />
      </Field>
      <Field data-invalid={!!errors.bio}>
        <FieldLabel htmlFor={bioId}>{t("details.bioLabel")}</FieldLabel>
        <Textarea
          id={bioId}
          rows={4}
          maxLength={ORG_PROFILE_BIO_MAX_LENGTH}
          placeholder={t("details.bioPlaceholder")}
          aria-invalid={!!errors.bio}
          aria-describedby={bioCounterId}
          disabled={disabled}
          {...form.register("bio")}
        />
        <p id={bioCounterId} className="text-right text-xs text-foreground/70 tabular-nums">
          {t("details.bioCounter", { current: bio.length, max: ORG_PROFILE_BIO_MAX_LENGTH })}
        </p>
        <FieldError errors={[errors.bio]} />
      </Field>
    </SettingsSection>
  );
}
