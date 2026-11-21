import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  FEEDER_TEST_DEFAULT_FORM_VALUES,
  feederTestFormSchema,
  type FeederTestFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { FeederTestPanelProps } from "@/lib/interfaces/calibration";
import { SettingsSection } from "@/features/settings/components/settings-section";

export function FeederTestPanel({ feederTest, isBlockedByRoutingTest }: FeederTestPanelProps) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<FeederTestFormValues>({
    resolver: zodResolver(feederTestFormSchema),
    defaultValues: FEEDER_TEST_DEFAULT_FORM_VALUES,
  });
  const runUntilStopped = useWatch({ control, name: "runUntilStopped" });
  const { isRunning, isStopping, cardsSent, cardsToSend, lastResult } = feederTest;
  const progress =
    cardsToSend === null
      ? t("calibration.feederTest.progress", { count: cardsSent })
      : t("calibration.feederTest.progressOfTotal", { count: cardsSent, total: cardsToSend });
  const isFailure = lastResult?.outcome === "feedFailed" || lastResult?.outcome === "routeFailed";

  return (
    <SettingsSection title={t("calibration.feederTest.heading")} description={t("calibration.feederTest.description")}>
      <Surface style={{ gap: SPACING.md }}>
        <Controller
          control={control}
          name="runUntilStopped"
          render={({ field }) => (
            <SwitchRow
              title={t("calibration.feederTest.runUntilStoppedLabel")}
              value={field.value}
              disabled={isRunning}
              onValueChange={field.onChange}
            />
          )}
        />
        {!runUntilStopped ? (
          <Controller
            control={control}
            name="cardsToSend"
            render={({ field, fieldState }) => (
              <TextField
                label={t("calibration.feederTest.cardsToSendLabel")}
                keyboardType="number-pad"
                editable={!isRunning}
                value={Number.isNaN(field.value) ? "" : String(field.value)}
                onBlur={field.onBlur}
                onChangeText={(text) => field.onChange(text.trim() === "" ? Number.NaN : Number(text))}
                error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
              />
            )}
          />
        ) : null}
        {isRunning ? (
          <Button
            variant="destructive"
            icon="stop"
            label={isStopping ? t("calibration.feederTest.stopping") : t("calibration.feederTest.stop")}
            disabled={isStopping}
            onPress={feederTest.stop}
          />
        ) : (
          <Button
            variant="secondary"
            icon="play"
            label={t("calibration.feederTest.start")}
            disabled={!feederTest.canStart || isBlockedByRoutingTest}
            onPress={handleSubmit((values) => feederTest.start(values))}
          />
        )}
        {isRunning ? (
          <AppText size="xs" tone="secondary">
            {progress}
          </AppText>
        ) : lastResult ? (
          <AppText size="xs" tone={isFailure ? "destructive" : "secondary"}>
            {t(`calibration.feederTest.results.${lastResult.outcome}`, { count: lastResult.cardsSent })}
            {isFailure && lastResult.error ? `: ${lastResult.error}` : ""}
          </AppText>
        ) : null}
      </Surface>
    </SettingsSection>
  );
}
