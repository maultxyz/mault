import { Callout } from "@/components/callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { usePlanSettingsDraft } from "@/features/admin/api/use-plan-settings-draft";
import { PlanLimitInput } from "@/features/admin/components/plan-limit-input";
import {
  PLAN_GRID_CLASS,
  PLAN_LIMIT_FALLBACK,
} from "@/lib/constants/admin-plans";
import { cn } from "@/lib/utils";
import {
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
} from "@magic-vault/shared";
import { IconRestore } from "@tabler/icons-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PlanSettingsManager() {
  const { t } = useTranslation("admin");
  const { form, data, isLoading, save, restoreDefaults } =
    usePlanSettingsDraft();
  const { isDirty, isSubmitting, errors } = form.formState;

  if (isLoading || !data) {
    return (
      <SettingsSection heading={t("plans.featuresHeading")}>
        <ListSkeleton />
      </SettingsSection>
    );
  }

  const planHeader = (
    <div
      className={cn(
        PLAN_GRID_CLASS,
        "px-3 py-2 text-xs font-medium uppercase tracking-wide text-foreground/70",
      )}
    >
      <span />
      {PLAN_KEYS.map((plan) => (
        <span key={plan}>{t(`plans.planNames.${plan}`)}</span>
      ))}
    </div>
  );

  return (
    <form id="plan-settings-form" onSubmit={save} className="contents">
      {!data.billingEnabled && (
        <Callout variant="info">{t("plans.billingDisabled")}</Callout>
      )}

      <SettingsSection
        heading={t("plans.featuresHeading")}
        description={t("plans.featuresDescription")}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restoreDefaults}
          >
            <IconRestore />
            {t("plans.restoreDefaults")}
          </Button>
        }
      >
        <div className="divide-y rounded-lg border">
          {planHeader}
          {PLAN_FEATURE_KEYS.map((feature) => (
            <div
              key={feature}
              className={cn(PLAN_GRID_CLASS, "items-center px-3 py-2.5")}
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">
                  {t(`plans.features.${feature}.label`)}
                </span>
                <span className="text-xs text-foreground/70">
                  {t(`plans.features.${feature}.description`)}
                </span>
              </div>
              {PLAN_KEYS.map((plan) => (
                <Controller
                  key={plan}
                  name={`${plan}.features.${feature}`}
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      aria-label={`${t(`plans.features.${feature}.label`)}: ${t(`plans.planNames.${plan}`)}`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        heading={t("plans.limitsHeading")}
        description={t("plans.limitsDescription")}
      >
        <div className="divide-y rounded-lg border">
          {planHeader}
          {PLAN_LIMIT_KEYS.map((limit) => (
            <div
              key={limit}
              className={cn(PLAN_GRID_CLASS, "items-start px-3 py-2.5")}
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">
                  {t(`plans.limits.${limit}.label`)}
                </span>
                <span className="text-xs text-foreground/70">
                  {t(`plans.limits.${limit}.description`)}
                </span>
              </div>
              {PLAN_KEYS.map((plan) => {
                const error = errors[plan]?.limits?.[limit]?.message;
                return (
                  <Controller
                    key={plan}
                    name={`${plan}.limits.${limit}`}
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <PlanLimitInput
                          id={`plan-${plan}-${limit}`}
                          label={`${t(`plans.limits.${limit}.label`)}: ${t(`plans.planNames.${plan}`)}`}
                          value={field.value}
                          fallback={
                            data.defaults[plan].limits[limit] ??
                            PLAN_LIMIT_FALLBACK
                          }
                          invalid={!!error}
                          onChange={field.onChange}
                        />
                        {error && (
                          <p className="text-2xs text-destructive">{error}</p>
                        )}
                      </div>
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SaveBar
        show={isDirty}
        formId="plan-settings-form"
        isSaving={isSubmitting}
        onDiscard={() => form.reset()}
      />
      <UnsavedChangesGuard isDirty={isDirty} />
    </form>
  );
}
