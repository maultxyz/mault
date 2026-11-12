import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { FeederTestPanelProps } from "@/lib/interfaces/calibration";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FEEDER_TEST_DEFAULT_FORM_VALUES,
  FEEDER_TEST_MAX_CARD_COUNT,
  FEEDER_TEST_MIN_CARD_COUNT,
  feederTestFormSchema,
  type FeederTestFormValues,
} from "@magic-vault/shared";
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function FeederTestPanel({
  feederTest,
  isBlockedByRoutingTest,
}: FeederTestPanelProps) {
  const { t } = useTranslation("calibration");
  const runUntilStoppedId = useId();
  const cardsToSendId = useId();
  const { control, handleSubmit } = useForm<FeederTestFormValues>({
    resolver: zodResolver(feederTestFormSchema),
    defaultValues: FEEDER_TEST_DEFAULT_FORM_VALUES,
  });
  const runUntilStopped = useWatch({ control, name: "runUntilStopped" });
  const { isRunning, isStopping, cardsSent, cardsToSend } = feederTest;
  const progress =
    cardsToSend === null
      ? t("feederTest.progress", { count: cardsSent })
      : t("feederTest.progressOfTotal", {
          count: cardsSent,
          total: cardsToSend,
        });

  return (
    <SettingsSection
      heading={t("feederTest.heading")}
      description={t("feederTest.description")}
    >
      <form
        onSubmit={handleSubmit((values) => feederTest.start(values))}
        className="flex max-w-sm flex-col gap-3"
      >
        <Controller
          control={control}
          name="runUntilStopped"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                id={runUntilStoppedId}
                aria-label={t("feederTest.runUntilStoppedLabel")}
                checked={field.value}
                disabled={isRunning}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor={runUntilStoppedId}>
                {t("feederTest.runUntilStoppedLabel")}
              </FieldLabel>
            </Field>
          )}
        />
        {!runUntilStopped && (
          <Controller
            control={control}
            name="cardsToSend"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel htmlFor={cardsToSendId}>
                  {t("feederTest.cardsToSendLabel")}
                </FieldLabel>
                <Input
                  id={cardsToSendId}
                  type="number"
                  inputMode="numeric"
                  min={FEEDER_TEST_MIN_CARD_COUNT}
                  max={FEEDER_TEST_MAX_CARD_COUNT}
                  className="tabular-nums"
                  disabled={isRunning}
                  aria-invalid={!!fieldState.error}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(event) =>
                    field.onChange(event.target.valueAsNumber)
                  }
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <Button
              type="button"
              variant="outline-destructive"
              disabled={isStopping}
              onClick={feederTest.stop}
            >
              <IconPlayerStop />
              {isStopping ? t("feederTest.stopping") : t("feederTest.stop")}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="outline"
              disabled={!feederTest.canStart || isBlockedByRoutingTest}
            >
              <IconPlayerPlay />
              {t("feederTest.start")}
            </Button>
          )}
          {(isRunning || cardsSent > 0) && (
            <span
              role="status"
              className="text-xs tabular-nums text-foreground/70"
            >
              {progress}
            </span>
          )}
        </div>
      </form>
    </SettingsSection>
  );
}
