import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Callout } from "@/components/callout";
import { FirmwareFeatureGate } from "@/components/firmware-feature-gate";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SliderField } from "@/components/slider-field";
import { foilCalibrationLabelSchema } from "@/schemas/foil-calibration.schema";
import type { FoilCalibrationPanelProps, FoilCaptureForm } from "@/lib/interfaces/foil-calibration";
import { FOIL_ANALYSIS_VERSION, FOIL_CALIBRATION_DEFAULT_BRIGHTNESS, FOIL_CALIBRATION_SAMPLE_LIMIT, FOIL_VERDICT_BADGE_VARIANTS, FOIL_VERDICT_LIMITS } from "@/lib/constants/foil-calibration";

export function FoilCalibrationPanel({ calibration }: FoilCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  const form = useForm<FoilCaptureForm>({
    resolver: zodResolver(foilCalibrationLabelSchema),
    defaultValues: { card: "", finish: "nonfoil", sleeved: false, notes: "", brightness: FOIL_CALIBRATION_DEFAULT_BRIGHTNESS, captureMode: "color" },
  });
  const captureMode = useWatch({ control: form.control, name: "captureMode" });
  const { busy, analyzingId, samples, loaded, error, canCapture, step, videoRef } = calibration;
  const working = busy || analyzingId !== null;

  return (
    <>
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <FirmwareFeatureGate feature="lighting">
      <SettingsSection heading={t("foilCalibration.heading")} description={t("foilCalibration.description")}>
        <Callout variant="info">{t("foilCalibration.instructions")}</Callout>
        <Callout variant="warning">{t("foilCalibration.limitations")}</Callout>
        {error && <Callout variant="error">{error}</Callout>}
        <form onSubmit={form.handleSubmit(calibration.capture)} className="flex flex-col gap-4">
          <fieldset disabled={working} className="flex flex-col gap-4">
            <Controller control={form.control} name="captureMode" render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="foil-capture-mode">{t("foilCalibration.captureMode")}</Label>
                <Select value={field.value} onValueChange={field.onChange} disabled={working}>
                  <SelectTrigger id="foil-capture-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">{t("foilCalibration.colorMode")}</SelectItem>
                    <SelectItem value="brightness">{t("foilCalibration.brightnessMode")}</SelectItem>
                    <SelectItem value="direction">{t("foilCalibration.directionMode")}</SelectItem>
                    <SelectItem value="staged">{t("foilCalibration.stagedMode")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )} />
            {captureMode === "staged" ? (
              <Callout variant="info">{t("foilCalibration.stagedSequence")}</Callout>
            ) : captureMode === "direction" ? (
              <Callout variant="info">{t("foilCalibration.directionSequence")}</Callout>
            ) : captureMode === "brightness" ? (
              <Callout variant="info">{t("foilCalibration.brightnessSequence")}</Callout>
            ) : (
              <>
            <Controller control={form.control} name="brightness" render={({ field }) => (
              <SliderField label={t("foilCalibration.brightness")} valueLabel={`${field.value} / 255`}
                min={1} max={255} value={field.value} disabled={working} onValueChange={field.onChange} />
            )} />
            <p className="text-xs text-foreground/70">{t("foilCalibration.brightnessHelp")}</p>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="foil-sample-card">{t("foilCalibration.card")}</Label>
              <Input id="foil-sample-card" maxLength={200} {...form.register("card")} aria-invalid={!!form.formState.errors.card} />
              {form.formState.errors.card && <p className="text-xs text-destructive">{t("foilCalibration.cardRequired")}</p>}
            </div>
            <Controller control={form.control} name="finish" render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="foil-sample-finish">{t("foilCalibration.finish")}</Label>
                <Select value={field.value} onValueChange={field.onChange} disabled={working}>
                  <SelectTrigger id="foil-sample-finish"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nonfoil">{t("foilCalibration.nonfoil")}</SelectItem>
                    <SelectItem value="foil">{t("foilCalibration.foil")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )} />
            <Controller control={form.control} name="sleeved" render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch id="foil-sample-sleeved" checked={field.value} onCheckedChange={field.onChange} disabled={working} />
                <Label htmlFor="foil-sample-sleeved">{t("foilCalibration.sleeved")}</Label>
              </div>
            )} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="foil-sample-notes">{t("foilCalibration.notes")}</Label>
              <Input id="foil-sample-notes" maxLength={1000} {...form.register("notes")} />
            </div>
          </fieldset>
          {!canCapture && !working && <p className="text-xs text-foreground/70">{t("foilCalibration.unavailable")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canCapture}>
              {busy ? t("foilCalibration.capturing") : t("foilCalibration.capture")}
            </Button>
            {busy && <Button type="button" variant="outline" onClick={calibration.cancel}>{t("foilCalibration.cancel")}</Button>}
          </div>
          {step && <p role="status" className="text-sm">{t("foilCalibration.progress", { step: t(`foilCalibration.steps.${step}`) })}</p>}
        </form>
        <p className="text-xs text-foreground/70">{t("foilCalibration.storage", { count: samples.length, limit: FOIL_CALIBRATION_SAMPLE_LIMIT })}</p>
        {calibration.totalCount >= FOIL_CALIBRATION_SAMPLE_LIMIT && <Callout variant="warning">{t("foilCalibration.storageFull")}</Callout>}
        {!loaded && <Skeleton className="h-16 w-full" />}
        {samples.map((sample) => (
          <div key={sample.id} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{sample.label.card} · {t(`foilCalibration.${sample.label.finish}`)}</p>
                {sample.analysis && sample.analysis.version >= FOIL_ANALYSIS_VERSION && sample.analysis.direction?.verdict && (
                  <Badge variant={FOIL_VERDICT_BADGE_VARIANTS[sample.analysis.direction.verdict]}>
                    {t(`foilCalibration.verdict.${sample.analysis.direction.verdict}`)}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void calibration.analyze(sample)} disabled={working}>
                  {analyzingId === sample.id ? t("foilCalibration.analyzing") : t("foilCalibration.analyze")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => calibration.exportSample(sample)} disabled={working}>{t("foilCalibration.export")}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void calibration.remove(sample.id)} disabled={working}>{t("foilCalibration.remove")}</Button>
              </div>
            </div>
            <p className="text-xs text-foreground/70">
              {new Date(sample.createdAt).toLocaleString()} · {sample.cameraLabel}
              {sample.label.sleeved && ` · ${t("foilCalibration.sleeved")}`}
            </p>
            {sample.label.notes && <p className="text-xs text-foreground/70">{sample.label.notes}</p>}
            <p className="text-xs text-foreground/70">{sample.frames.map((frame) =>
              `${t(`foilCalibration.steps.${frame.step}`)}: ${frame.lighting.lightMode === "off" ? 0 : frame.lighting.lightBrightness}/255`).join(" > ")}</p>
            {sample.analysis && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-foreground/70">{t("foilCalibration.analysisVersion", { version: sample.analysis.version })}</p>
                <p className="text-xs text-foreground/70">{t("foilCalibration.analysisHelp")}</p>
                {sample.analysis.version >= 2 && <Callout variant="info">{t("foilCalibration.reflectionHelp")}</Callout>}
                {sample.analysis.version >= 3 && <Callout variant="info">{t("foilCalibration.ambientHelp")}</Callout>}
                {sample.analysis.warnings.map((warning) => (
                  <Callout key={warning} variant="warning">{t(`foilCalibration.quality.${warning}`)}</Callout>
                ))}
                {sample.analysis.whiteComparison && (
                  <p className="text-xs text-foreground/70">{t("foilCalibration.whiteComparison", {
                    shift: (sample.analysis.whiteComparison.meanShift * 100).toFixed(1),
                    difference: (sample.analysis.whiteComparison.normalizedMae * 100).toFixed(1),
                    movement: (sample.analysis.whiteComparison.cornerShiftFraction * 100).toFixed(1),
                  })}</p>
                )}
                {sample.analysis.brightComparison && (
                  <p className="text-xs text-foreground/70">{t("foilCalibration.brightComparison", {
                    shift: (sample.analysis.brightComparison.meanShift * 100).toFixed(1),
                    difference: (sample.analysis.brightComparison.normalizedMae * 100).toFixed(1),
                    movement: (sample.analysis.brightComparison.cornerShiftFraction * 100).toFixed(1),
                  })}</p>
                )}
                {sample.analysis.ambientComparison && (
                  <p className="text-xs text-foreground/70">{t("foilCalibration.ambientComparison", {
                    shift: (sample.analysis.ambientComparison.meanShift * 100).toFixed(1),
                    difference: (sample.analysis.ambientComparison.normalizedMae * 100).toFixed(1),
                    movement: (sample.analysis.ambientComparison.cornerShiftFraction * 100).toFixed(1),
                  })}</p>
                )}
                {sample.analysis.direction && (
                  <>
                    {sample.analysis.version < FOIL_ANALYSIS_VERSION && (
                      <Callout variant="warning">{t("foilCalibration.reanalyzeGlare")}</Callout>
                    )}
                    {sample.analysis.version >= FOIL_ANALYSIS_VERSION && sample.analysis.direction.verdict && sample.analysis.direction.verdict !== "uncertain" &&
                      (sample.analysis.direction.verdict === "foil") !== (sample.label.finish === "foil") && (
                      <Callout variant="warning">{t("foilCalibration.verdictMismatch")}</Callout>
                    )}
                    {sample.analysis.direction.rainbow != null && sample.analysis.direction.rainbowRepeat != null && (
                      <p className="text-xs text-foreground/70">{t("foilCalibration.rainbowScore", {
                        far: sample.analysis.direction.farLed ?? 3,
                        first: sample.analysis.direction.rainbow.toFixed(1),
                        repeat: sample.analysis.direction.rainbowRepeat.toFixed(1),
                      })}</p>
                    )}
                    {sample.analysis.direction.localRainbow != null && sample.analysis.direction.localRainbowRepeat != null && (
                      <p className="text-xs text-foreground/70">{t("foilCalibration.localRainbowScore", {
                        first: sample.analysis.direction.localRainbow.toFixed(1),
                        repeat: sample.analysis.direction.localRainbowRepeat.toFixed(1),
                      })}</p>
                    )}
                    {sample.analysis.direction.reflectance && (
                      <>
                        <p className="text-xs text-foreground/70">{t("foilCalibration.normalizedScore", {
                          first: sample.analysis.direction.reflectance.first?.score.toFixed(1) ?? "-",
                          repeat: sample.analysis.direction.reflectance.repeat?.score.toFixed(1) ?? "-",
                          noise0: sample.analysis.direction.reflectance.led0Noise?.score.toFixed(1) ?? "-",
                          noiseFar: sample.analysis.direction.reflectance.farNoise?.score.toFixed(1) ?? "-",
                          foil: FOIL_VERDICT_LIMITS.foilMinimum,
                          nonFoil: FOIL_VERDICT_LIMITS.nonFoilMaximum,
                        })}</p>
                        <p className="text-xs text-foreground/70">{t("foilCalibration.normalizedCoverage", {
                          eligible: sample.analysis.direction.reflectance.first ? (sample.analysis.direction.reflectance.first.eligibleFraction * 100).toFixed(1) : "-",
                          eligibleRepeat: sample.analysis.direction.reflectance.repeat ? (sample.analysis.direction.reflectance.repeat.eligibleFraction * 100).toFixed(1) : "-",
                          changed: sample.analysis.direction.reflectance.first ? (sample.analysis.direction.reflectance.first.changedFraction * 100).toFixed(1) : "-",
                          changedRepeat: sample.analysis.direction.reflectance.repeat ? (sample.analysis.direction.reflectance.repeat.changedFraction * 100).toFixed(1) : "-",
                        })}</p>
                      </>
                    )}
                    <Callout variant="info">{t("foilCalibration.directionHelp", { far: sample.analysis.direction.farLed ?? 3 })}</Callout>
                    {([["directionResponse", sample.analysis.direction.response], ["directionNoise", sample.analysis.direction.repeatNoise]] as const).map(([key, response]) => (
                      <p key={key} className="text-xs text-foreground/70">{response ? t(`foilCalibration.${key}`, {
                        far: sample.analysis?.direction?.farLed ?? 3,
                        eligible: (response.eligibleFraction * 100).toFixed(1),
                        peak: (response.residualP99 * 100).toFixed(1),
                        glints: (response.glintFraction * 100).toFixed(2),
                      }) : t("foilCalibration.directionUnavailable")}</p>
                    ))}
                    {([["LED 0", sample.analysis.direction.led0Comparison], [`LED ${sample.analysis.direction.farLed ?? 3}`, sample.analysis.direction.farComparison ?? sample.analysis.direction.led3Comparison]] as const).map(([led, comparison]) => comparison && (
                      <p key={led} className="text-xs text-foreground/70">{t("foilCalibration.directionStability", {
                        led,
                        shift: (comparison.meanShift * 100).toFixed(1),
                        difference: (comparison.normalizedMae * 100).toFixed(1),
                        movement: (comparison.cornerShiftFraction * 100).toFixed(1),
                      })}</p>
                    ))}
                  </>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sample.frames.map((frame) => {
                const analyzed = sample.analysis?.frames.find((item) => item.step === frame.step);
                return (
                <figure key={frame.step} className="flex flex-col gap-1">
                  <img src={frame.image} alt={t("foilCalibration.frameAlt", { card: sample.label.card, step: t(`foilCalibration.steps.${frame.step}`) })} className="max-h-48 w-full rounded-md object-contain" loading="lazy" />
                  <figcaption className="text-xs text-foreground/70">
                    {t(`foilCalibration.steps.${frame.step}`)} · {t("foilCalibration.clipped", { percent: (frame.clippedFraction * 100).toFixed(1) })}
                  </figcaption>
                  {analyzed?.cardImage && <img src={analyzed.cardImage} alt={t("foilCalibration.cardCrop")}
                    className="max-h-40 w-full rounded-md object-contain" loading="lazy" />}
                  {analyzed?.metrics && <figcaption className="text-xs text-foreground/70">{t("foilCalibration.cardMetrics", {
                    clipping: (analyzed.metrics.clippedFraction * 100).toFixed(1),
                    highlights: (analyzed.metrics.highlightFraction * 100).toFixed(1),
                  })}</figcaption>}
                  {sample.analysis?.version === 3 && frame.step !== "ambient" && (
                    <figcaption className="text-xs text-foreground/70">
                      {analyzed?.ambientResponse ? t("foilCalibration.ambientMetrics", {
                        eligible: (analyzed.ambientResponse.eligibleFraction * 100).toFixed(1),
                        mean: (analyzed.ambientResponse.positiveMean * 100).toFixed(1),
                        peak: (analyzed.ambientResponse.positiveP99 * 100).toFixed(1),
                        negative: (analyzed.ambientResponse.negativeMean * 100).toFixed(1),
                      }) : t("foilCalibration.ambientUnavailable")}
                    </figcaption>
                  )}
                  {analyzed?.reflections && <figcaption className="text-xs text-foreground/70">{t("foilCalibration.reflections", {
                    contrast: (analyzed.reflections.peakContrast * 100).toFixed(1),
                    count: analyzed.reflections.spotCount,
                    area: (analyzed.reflections.spotFraction * 100).toFixed(2),
                    largest: (analyzed.reflections.largestSpotFraction * 100).toFixed(2),
                    compactness: (analyzed.reflections.largestSpotCompactness * 100).toFixed(0),
                  })}</figcaption>}
                </figure>
                );
              })}
            </div>
          </div>
        ))}
      </SettingsSection>
      </FirmwareFeatureGate>
    </>
  );
}
