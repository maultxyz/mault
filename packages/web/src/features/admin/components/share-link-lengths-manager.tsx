import { LoadErrorCallout } from "@/components/load-error-callout";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { SettingsSectionsSkeleton } from "@/components/settings-section-skeleton";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useShareLinkLengthsDraft } from "@/features/admin/api/use-share-link-lengths-draft";
import { SHARE_LINK_HOURS_FIELDS } from "@/lib/constants/admin";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import {
  MONITOR_LINK_EXPIRY_DAYS_MAX,
  MONITOR_LINK_EXPIRY_OPTIONS_MAX,
  SHARE_LINK_HOURS_MAX,
} from "@magic-vault/shared";
import { IconRestore } from "@tabler/icons-react";
import { useId } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ShareLinkLengthsManager() {
  const { t } = useTranslation("admin");
  const idPrefix = useId();
  const { form, isLoading, isError, refetch, save, restoreDefaults } =
    useShareLinkLengthsDraft();
  const { isDirty, isSubmitting, errors } = form.formState;
  const heading = t("shareLinkLengths.heading");

  if (isError) {
    return (
      <SettingsSection heading={heading}>
        <LoadErrorCallout
          message={t("shareLinkLengths.loadFailed")}
          onRetry={() => void refetch()}
        />
      </SettingsSection>
    );
  }

  if (isLoading) {
    return (
      <SettingsSectionsSkeleton
        sections={[
          {
            fields: SHARE_LINK_HOURS_FIELDS.length + 1,
            hasAction: true,
            hasFieldDescriptions: true,
            controlClassName: "max-w-40",
          },
        ]}
      />
    );
  }

  const daysId = `${idPrefix}-monitor-days`;
  const daysHintId = `${daysId}-hint`;

  return (
    <>
      <SettingsSection
        heading={heading}
        description={t("shareLinkLengths.description")}
        action={
          <Button type="button" variant="outline" onClick={restoreDefaults}>
            <IconRestore />
            {t("shareLinkLengths.restoreDefaults")}
          </Button>
        }
      >
        {SHARE_LINK_HOURS_FIELDS.map((name) => {
          const id = `${idPrefix}-${name}`;
          const hintId = `${id}-hint`;
          const error = errors[name];
          return (
            <Controller
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor={id}>
                    {t(`shareLinkLengths.fields.${name}.label`)}
                  </FieldLabel>
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={SHARE_LINK_HOURS_MAX}
                    className="max-w-40"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                    aria-invalid={!!error}
                    aria-describedby={hintId}
                  />
                  <FieldDescription id={hintId}>
                    {t(`shareLinkLengths.fields.${name}.description`, {
                      max: SHARE_LINK_HOURS_MAX,
                    })}
                  </FieldDescription>
                  {error && <FieldError errors={[error]} />}
                </Field>
              )}
            />
          );
        })}
        <Field
          data-invalid={errors.monitorLinkExpiryDaysText ? true : undefined}
        >
          <FieldLabel htmlFor={daysId}>
            {t("shareLinkLengths.fields.monitorLinkExpiryDays.label")}
          </FieldLabel>
          <Input
            id={daysId}
            inputMode="numeric"
            className="max-w-60"
            aria-invalid={!!errors.monitorLinkExpiryDaysText}
            aria-describedby={daysHintId}
            {...form.register("monitorLinkExpiryDaysText")}
          />
          <FieldDescription id={daysHintId}>
            {t("shareLinkLengths.fields.monitorLinkExpiryDays.description", {
              maxOptions: MONITOR_LINK_EXPIRY_OPTIONS_MAX,
              maxDays: MONITOR_LINK_EXPIRY_DAYS_MAX,
            })}
          </FieldDescription>
          {errors.monitorLinkExpiryDaysText && (
            <FieldError errors={[errors.monitorLinkExpiryDaysText]} />
          )}
        </Field>
      </SettingsSection>
      <SaveBar
        show={isDirty}
        onSave={() => void save()}
        isSaving={isSubmitting}
        onDiscard={() => form.reset(undefined, DISCARD_RESET_OPTIONS)}
      />
      <UnsavedChangesGuard isDirty={isDirty} />
    </>
  );
}
